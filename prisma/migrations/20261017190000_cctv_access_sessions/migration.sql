CREATE TYPE "CctvSessionPurpose" AS ENUM ('LIVE', 'RECORDINGS', 'PTZ');
CREATE TABLE "CctvAccessSession" (
  "id" UUID NOT NULL,
  "homeId" UUID NOT NULL,
  "cameraId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "purpose" "CctvSessionPurpose" NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CctvAccessSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CctvAccessSession_homeId_userId_expiresAt_idx" ON "CctvAccessSession"("homeId", "userId", "expiresAt");
CREATE INDEX "CctvAccessSession_cameraId_expiresAt_idx" ON "CctvAccessSession"("cameraId", "expiresAt");
ALTER TABLE "CctvAccessSession" ADD CONSTRAINT "CctvAccessSession_cameraId_homeId_fkey" FOREIGN KEY ("cameraId", "homeId") REFERENCES "Camera"("id", "homeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CctvAccessSession" ADD CONSTRAINT "CctvAccessSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
