-- CCTV gateway enrollment persistence. Additive; existing smart-home Gateway is unchanged.
CREATE TABLE "CctvGateway" (
  "id" UUID NOT NULL,
  "homeId" UUID NOT NULL,
  "displayName" TEXT NOT NULL,
  "publicKey" TEXT NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'ACTIVE',
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CctvGateway_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CctvGateway_state_check" CHECK ("state" IN ('PENDING','ACTIVE','SUSPENDED','REVOKED'))
);
CREATE UNIQUE INDEX "CctvGateway_id_homeId_key" ON "CctvGateway"("id","homeId");
CREATE INDEX "CctvGateway_homeId_state_idx" ON "CctvGateway"("homeId","state");
ALTER TABLE "CctvGateway" ADD CONSTRAINT "CctvGateway_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CctvGatewayEnrollmentCode" (
  "id" UUID NOT NULL,
  "homeId" UUID NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CctvGatewayEnrollmentCode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CctvGatewayEnrollmentCode_codeHash_key" ON "CctvGatewayEnrollmentCode"("codeHash");
CREATE INDEX "CctvGatewayEnrollmentCode_homeId_expiresAt_idx" ON "CctvGatewayEnrollmentCode"("homeId","expiresAt");
ALTER TABLE "CctvGatewayEnrollmentCode" ADD CONSTRAINT "CctvGatewayEnrollmentCode_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
