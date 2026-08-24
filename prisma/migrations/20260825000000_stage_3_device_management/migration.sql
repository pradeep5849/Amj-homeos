CREATE TYPE "DeviceProtocol" AS ENUM ('WIFI', 'ZIGBEE', 'TUYA');
CREATE TYPE "DeviceType" AS ENUM ('LIGHT', 'SWITCH', 'FAN', 'SENSOR', 'OTHER');
CREATE TABLE "Device" (
  "id" UUID NOT NULL, "homeId" UUID NOT NULL, "roomId" UUID, "name" TEXT NOT NULL,
  "deviceType" "DeviceType" NOT NULL, "protocol" "DeviceProtocol" NOT NULL,
  "manufacturer" TEXT, "model" TEXT, "externalDeviceId" TEXT,
  "isOnline" BOOLEAN NOT NULL DEFAULT false, "lastSeenAt" TIMESTAMP(3),
  "capabilities" JSONB NOT NULL, "state" JSONB NOT NULL,
  "isArchived" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Device_homeId_isArchived_idx" ON "Device"("homeId", "isArchived");
CREATE INDEX "Device_roomId_isArchived_idx" ON "Device"("roomId", "isArchived");
ALTER TABLE "Device" ADD CONSTRAINT "Device_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Device" ADD CONSTRAINT "Device_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE FUNCTION enforce_device_room_home() RETURNS trigger AS $$ BEGIN
  IF NEW."roomId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Room" WHERE "id" = NEW."roomId" AND "homeId" = NEW."homeId") THEN
    RAISE EXCEPTION 'Device Room must belong to Device Home' USING ERRCODE = '23514';
  END IF; RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "Device_room_home_guard" BEFORE INSERT OR UPDATE OF "homeId", "roomId" ON "Device" FOR EACH ROW EXECUTE FUNCTION enforce_device_room_home();
