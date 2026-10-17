ALTER TABLE "Gateway" ADD COLUMN "cctvPublicKey" TEXT;
ALTER TABLE "Gateway" ADD COLUMN "cctvPairedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Gateway_id_homeId_key" ON "Gateway"("id", "homeId");
CREATE TABLE "CctvGatewayPairingChallenge" (
  "id" UUID NOT NULL,
  "gatewayId" UUID NOT NULL,
  "homeId" UUID NOT NULL,
  "tokenDigest" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CctvGatewayPairingChallenge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CctvGatewayPairingChallenge_tokenDigest_key" ON "CctvGatewayPairingChallenge"("tokenDigest");
CREATE INDEX "CctvGatewayPairingChallenge_gatewayId_homeId_expiresAt_idx" ON "CctvGatewayPairingChallenge"("gatewayId", "homeId", "expiresAt");
ALTER TABLE "CctvGatewayPairingChallenge" ADD CONSTRAINT "CctvGatewayPairingChallenge_gatewayId_homeId_fkey"
  FOREIGN KEY ("gatewayId", "homeId") REFERENCES "Gateway"("id", "homeId") ON DELETE RESTRICT ON UPDATE CASCADE;
