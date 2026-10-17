-- CCTV-02 additive registry migration. No existing records modified.
CREATE TYPE "CameraSourceKind" AS ENUM ('IP_CAMERA','NVR_CHANNEL','DVR_CHANNEL');
CREATE TYPE "CameraConnectionMethod" AS ENUM ('ONVIF_RTSP','RTSP','VENDOR_API','UNSUPPORTED');
CREATE TYPE "CameraConnectionStatus" AS ENUM ('UNKNOWN','ONLINE','OFFLINE');
CREATE TYPE "CameraBrand" AS ENUM ('HIKVISION','CP_PLUS','DAHUA','TAPO','EZVIZ','REOLINK','GENERIC_ONVIF','OTHER');

CREATE TABLE "CameraRecorder" (
  "id" UUID NOT NULL,
  "homeId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "brand" "CameraBrand" NOT NULL,
  "model" TEXT,
  "secretRef" TEXT,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CameraRecorder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CameraRecorder_id_homeId_key" ON "CameraRecorder"("id","homeId");
CREATE INDEX "CameraRecorder_homeId_isArchived_idx" ON "CameraRecorder"("homeId","isArchived");
ALTER TABLE "CameraRecorder" ADD CONSTRAINT "CameraRecorder_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Camera" (
  "id" UUID NOT NULL,
  "homeId" UUID NOT NULL,
  "roomId" UUID,
  "recorderId" UUID,
  "recorderChannel" INTEGER,
  "name" TEXT NOT NULL,
  "brand" "CameraBrand" NOT NULL,
  "model" TEXT,
  "sourceKind" "CameraSourceKind" NOT NULL,
  "connectionMethod" "CameraConnectionMethod" NOT NULL DEFAULT 'UNSUPPORTED',
  "connectionStatus" "CameraConnectionStatus" NOT NULL DEFAULT 'UNKNOWN',
  "capabilities" JSONB NOT NULL,
  "secretRef" TEXT,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Camera_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Camera_recorder_pair_check" CHECK (
    ("recorderId" IS NULL AND "recorderChannel" IS NULL AND "sourceKind" = 'IP_CAMERA')
    OR
    ("recorderId" IS NOT NULL AND "recorderChannel" IS NOT NULL AND "recorderChannel" > 0 AND "sourceKind" IN ('NVR_CHANNEL','DVR_CHANNEL'))
  )
);
CREATE UNIQUE INDEX "Camera_recorderId_recorderChannel_key" ON "Camera"("recorderId","recorderChannel");
CREATE INDEX "Camera_homeId_isArchived_idx" ON "Camera"("homeId","isArchived");
CREATE INDEX "Camera_roomId_isArchived_idx" ON "Camera"("roomId","isArchived");
ALTER TABLE "Camera" ADD CONSTRAINT "Camera_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Camera" ADD CONSTRAINT "Camera_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Camera" ADD CONSTRAINT "Camera_recorderId_homeId_fkey" FOREIGN KEY ("recorderId","homeId") REFERENCES "CameraRecorder"("id","homeId") ON DELETE RESTRICT ON UPDATE CASCADE;
