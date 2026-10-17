CREATE TABLE "CctvGatewayRequestNonce" (
  "id" UUID NOT NULL,
  "gatewayId" UUID NOT NULL,
  "homeId" UUID NOT NULL,
  "nonce" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CctvGatewayRequestNonce_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CctvGatewayRequestNonce_gatewayId_nonce_key" ON "CctvGatewayRequestNonce"("gatewayId", "nonce");
CREATE INDEX "CctvGatewayRequestNonce_createdAt_idx" ON "CctvGatewayRequestNonce"("createdAt");
ALTER TABLE "CctvGatewayRequestNonce" ADD CONSTRAINT "CctvGatewayRequestNonce_gatewayId_homeId_fkey"
 FOREIGN KEY ("gatewayId", "homeId") REFERENCES "Gateway"("id", "homeId") ON DELETE RESTRICT ON UPDATE CASCADE;
