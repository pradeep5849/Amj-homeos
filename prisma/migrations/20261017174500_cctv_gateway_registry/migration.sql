-- CCTV gateways reuse the existing Gateway model; legacy gateways keep NULL cctvStatus.
ALTER TYPE "GatewayType" ADD VALUE IF NOT EXISTS 'CCTV';
CREATE TYPE "CctvGatewayStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED');
ALTER TABLE "Gateway" ADD COLUMN "cctvStatus" "CctvGatewayStatus";
