CREATE TYPE "TelemetryMetric" AS ENUM ('POWER_WATTS','ENERGY_WH','VOLTAGE_VOLTS','CURRENT_AMPS','TEMPERATURE_C','HUMIDITY_PERCENT','BATTERY_PERCENT','SIGNAL_RSSI_DBM');
CREATE TYPE "TelemetrySource" AS ENUM ('PROVIDER','SYSTEM','TEST');
CREATE TYPE "TelemetryQuality" AS ENUM ('MEASURED','ESTIMATED','TEST');
CREATE TYPE "DeviceHealthStatus" AS ENUM ('ONLINE','OFFLINE','DEGRADED','UNKNOWN');

ALTER TABLE "Device" ADD COLUMN "healthStatus" "DeviceHealthStatus" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "lastTelemetryAt" TIMESTAMP(3), ADD COLUMN "lastHealthChangeAt" TIMESTAMP(3), ADD COLUMN "healthReason" TEXT;

CREATE TABLE "DeviceTelemetry" (
 "id" UUID NOT NULL, "deviceId" UUID NOT NULL, "homeId" UUID NOT NULL,
 "metric" "TelemetryMetric" NOT NULL, "value" DOUBLE PRECISION NOT NULL, "unit" TEXT NOT NULL,
 "recordedAt" TIMESTAMP(3) NOT NULL, "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "source" "TelemetrySource" NOT NULL, "provider" TEXT NOT NULL, "externalEventId" TEXT,
 "quality" "TelemetryQuality" NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "DeviceTelemetry_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "DeviceTelemetry_value_finite" CHECK ("value" NOT IN ('Infinity'::float8, '-Infinity'::float8, 'NaN'::float8)),
 CONSTRAINT "DeviceTelemetry_metric_range" CHECK (
  ("metric" IN ('POWER_WATTS','ENERGY_WH','VOLTAGE_VOLTS','CURRENT_AMPS') AND "value" >= 0 AND "value" <= 10000000) OR
  ("metric" = 'TEMPERATURE_C' AND "value" BETWEEN -100 AND 200) OR
  ("metric" IN ('HUMIDITY_PERCENT','BATTERY_PERCENT') AND "value" BETWEEN 0 AND 100) OR
  ("metric" = 'SIGNAL_RSSI_DBM' AND "value" BETWEEN -200 AND 0)
 )
);
CREATE TABLE "DeviceEnergyDaily" (
 "id" UUID NOT NULL, "deviceId" UUID NOT NULL, "homeId" UUID NOT NULL, "localDate" DATE NOT NULL,
 "timezone" TEXT NOT NULL, "measuredWh" DOUBLE PRECISION, "estimatedWh" DOUBLE PRECISION,
 "peakPowerWatts" DOUBLE PRECISION, "sampleCount" INTEGER NOT NULL DEFAULT 0,
 "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "DeviceEnergyDaily_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "DeviceEnergyDaily_nonnegative" CHECK (("measuredWh" IS NULL OR "measuredWh" >= 0) AND ("estimatedWh" IS NULL OR "estimatedWh" >= 0) AND ("peakPowerWatts" IS NULL OR "peakPowerWatts" >= 0))
);
CREATE TABLE "DeviceHealthEvent" (
 "id" UUID NOT NULL, "deviceId" UUID NOT NULL, "homeId" UUID NOT NULL, "status" "DeviceHealthStatus" NOT NULL,
 "reason" TEXT NOT NULL, "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "DeviceHealthEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DeviceTelemetry_deviceId_provider_source_externalEventId_key" ON "DeviceTelemetry"("deviceId","provider","source","externalEventId");
CREATE INDEX "DeviceTelemetry_deviceId_metric_recordedAt_idx" ON "DeviceTelemetry"("deviceId","metric","recordedAt");
CREATE INDEX "DeviceTelemetry_homeId_recordedAt_idx" ON "DeviceTelemetry"("homeId","recordedAt");
CREATE UNIQUE INDEX "DeviceEnergyDaily_deviceId_localDate_key" ON "DeviceEnergyDaily"("deviceId","localDate");
CREATE INDEX "DeviceEnergyDaily_homeId_localDate_idx" ON "DeviceEnergyDaily"("homeId","localDate");
CREATE INDEX "Device_healthStatus_idx" ON "Device"("healthStatus");
CREATE INDEX "DeviceHealthEvent_deviceId_occurredAt_idx" ON "DeviceHealthEvent"("deviceId","occurredAt");
CREATE INDEX "DeviceHealthEvent_homeId_status_idx" ON "DeviceHealthEvent"("homeId","status");
ALTER TABLE "DeviceTelemetry" ADD CONSTRAINT "DeviceTelemetry_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeviceTelemetry" ADD CONSTRAINT "DeviceTelemetry_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeviceEnergyDaily" ADD CONSTRAINT "DeviceEnergyDaily_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeviceEnergyDaily" ADD CONSTRAINT "DeviceEnergyDaily_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeviceHealthEvent" ADD CONSTRAINT "DeviceHealthEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeviceHealthEvent" ADD CONSTRAINT "DeviceHealthEvent_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION guard_device_home_scope() RETURNS trigger AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM "Device" d WHERE d.id=NEW."deviceId" AND d."homeId"=NEW."homeId") THEN
  RAISE EXCEPTION 'device and home must match' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "DeviceTelemetry_home_guard" BEFORE INSERT OR UPDATE ON "DeviceTelemetry" FOR EACH ROW EXECUTE FUNCTION guard_device_home_scope();
CREATE TRIGGER "DeviceEnergyDaily_home_guard" BEFORE INSERT OR UPDATE ON "DeviceEnergyDaily" FOR EACH ROW EXECUTE FUNCTION guard_device_home_scope();
CREATE TRIGGER "DeviceHealthEvent_home_guard" BEFORE INSERT OR UPDATE ON "DeviceHealthEvent" FOR EACH ROW EXECUTE FUNCTION guard_device_home_scope();
