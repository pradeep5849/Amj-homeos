-- Issue #22: switchboard catalog foundation
-- Safe additive migration: existing device/home data is preserved.

CREATE TYPE "SwitchboardControlType" AS ENUM ('SWITCH', 'FAN', 'SOCKET', 'HEAVY_SWITCH', 'DOORBELL', 'SCENE');

CREATE TABLE "SwitchboardCatalogModel" (
  "id" UUID NOT NULL,
  "brand" TEXT NOT NULL,
  "moduleSize" TEXT NOT NULL,
  "configurationCode" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "configurationLabel" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "needsCodeVerification" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SwitchboardCatalogModel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SwitchboardCatalogProtocol" (
  "id" UUID NOT NULL,
  "catalogModelId" UUID NOT NULL,
  "protocol" "DeviceProtocol" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SwitchboardCatalogProtocol_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SwitchboardCatalogChannel" (
  "id" UUID NOT NULL,
  "catalogModelId" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  "controlType" "SwitchboardControlType" NOT NULL,
  "defaultLabel" TEXT NOT NULL,
  "capabilities" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SwitchboardCatalogChannel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InstalledSwitchboard" (
  "id" UUID NOT NULL,
  "homeId" UUID NOT NULL,
  "roomId" UUID NOT NULL,
  "catalogModelId" UUID NOT NULL,
  "protocol" "DeviceProtocol" NOT NULL,
  "name" TEXT NOT NULL,
  "externalBoardId" TEXT,
  "isOnline" BOOLEAN NOT NULL DEFAULT false,
  "lastSeenAt" TIMESTAMP(3),
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InstalledSwitchboard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InstalledSwitchboardChannel" (
  "id" UUID NOT NULL,
  "switchboardId" UUID NOT NULL,
  "catalogChannelId" UUID NOT NULL,
  "deviceId" UUID,
  "label" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InstalledSwitchboardChannel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SwitchboardCatalogModel_brand_configurationCode_key" ON "SwitchboardCatalogModel"("brand", "configurationCode");
CREATE INDEX "SwitchboardCatalogModel_brand_moduleSize_isActive_idx" ON "SwitchboardCatalogModel"("brand", "moduleSize", "isActive");
CREATE UNIQUE INDEX "SwitchboardCatalogProtocol_catalogModelId_protocol_key" ON "SwitchboardCatalogProtocol"("catalogModelId", "protocol");
CREATE UNIQUE INDEX "SwitchboardCatalogChannel_catalogModelId_position_key" ON "SwitchboardCatalogChannel"("catalogModelId", "position");
CREATE INDEX "SwitchboardCatalogChannel_catalogModelId_idx" ON "SwitchboardCatalogChannel"("catalogModelId");
CREATE INDEX "InstalledSwitchboard_homeId_roomId_isArchived_idx" ON "InstalledSwitchboard"("homeId", "roomId", "isArchived");
CREATE INDEX "InstalledSwitchboard_catalogModelId_idx" ON "InstalledSwitchboard"("catalogModelId");
CREATE UNIQUE INDEX "InstalledSwitchboardChannel_switchboardId_catalogChannelId_key" ON "InstalledSwitchboardChannel"("switchboardId", "catalogChannelId");
CREATE UNIQUE INDEX "InstalledSwitchboardChannel_deviceId_key" ON "InstalledSwitchboardChannel"("deviceId");

ALTER TABLE "SwitchboardCatalogProtocol" ADD CONSTRAINT "SwitchboardCatalogProtocol_catalogModelId_fkey" FOREIGN KEY ("catalogModelId") REFERENCES "SwitchboardCatalogModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SwitchboardCatalogChannel" ADD CONSTRAINT "SwitchboardCatalogChannel_catalogModelId_fkey" FOREIGN KEY ("catalogModelId") REFERENCES "SwitchboardCatalogModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InstalledSwitchboard" ADD CONSTRAINT "InstalledSwitchboard_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InstalledSwitchboard" ADD CONSTRAINT "InstalledSwitchboard_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InstalledSwitchboard" ADD CONSTRAINT "InstalledSwitchboard_catalogModelId_fkey" FOREIGN KEY ("catalogModelId") REFERENCES "SwitchboardCatalogModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InstalledSwitchboardChannel" ADD CONSTRAINT "InstalledSwitchboardChannel_switchboardId_fkey" FOREIGN KEY ("switchboardId") REFERENCES "InstalledSwitchboard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InstalledSwitchboardChannel" ADD CONSTRAINT "InstalledSwitchboardChannel_catalogChannelId_fkey" FOREIGN KEY ("catalogChannelId") REFERENCES "SwitchboardCatalogChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InstalledSwitchboardChannel" ADD CONSTRAINT "InstalledSwitchboardChannel_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;
