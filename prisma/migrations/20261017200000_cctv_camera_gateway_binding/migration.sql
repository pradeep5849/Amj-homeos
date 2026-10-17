ALTER TABLE "Camera" ADD COLUMN "cctvGatewayId" UUID;
CREATE INDEX "Camera_cctvGatewayId_isArchived_idx" ON "Camera"("cctvGatewayId", "isArchived");
ALTER TABLE "Camera" ADD CONSTRAINT "Camera_cctvGatewayId_homeId_fkey"
  FOREIGN KEY ("cctvGatewayId", "homeId") REFERENCES "Gateway"("id", "homeId")
  ON DELETE RESTRICT ON UPDATE CASCADE;
