-- Additive challenge storage for Ed25519 gateway authentication.
CREATE TABLE "CctvGatewayChallenge" (
  "id" UUID NOT NULL,
  "homeId" UUID NOT NULL,
  "gatewayId" UUID NOT NULL,
  "digest" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CctvGatewayChallenge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CctvGatewayChallenge_digest_key" ON "CctvGatewayChallenge"("digest");
CREATE INDEX "CctvGatewayChallenge_gatewayId_expiresAt_idx" ON "CctvGatewayChallenge"("gatewayId","expiresAt");
CREATE INDEX "CctvGatewayChallenge_homeId_expiresAt_idx" ON "CctvGatewayChallenge"("homeId","expiresAt");
ALTER TABLE "CctvGatewayChallenge" ADD CONSTRAINT "CctvGatewayChallenge_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CctvGatewayChallenge" ADD CONSTRAINT "CctvGatewayChallenge_gatewayId_homeId_fkey" FOREIGN KEY ("gatewayId","homeId") REFERENCES "CctvGateway"("id","homeId") ON DELETE RESTRICT ON UPDATE CASCADE;
