-- CreateEnum
CREATE TYPE "PresenceStatus" AS ENUM ('HOME', 'AWAY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PresenceSource" AS ENUM ('MANUAL', 'GEOFENCE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "PresenceEventType" AS ENUM ('ENTER', 'EXIT', 'LOCATION_SAMPLE', 'MANUAL');

-- CreateEnum
CREATE TYPE "MobilePlatform" AS ENUM ('ANDROID', 'IOS', 'WEB');

-- CreateEnum
CREATE TYPE "PushProvider" AS ENUM ('FCM', 'APNS', 'WEB_PUSH');

-- CreateEnum
CREATE TYPE "DeliveryChannel" AS ENUM ('IN_APP', 'PUSH');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'NOT_CONFIGURED', 'SKIPPED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AutomationTriggerType" ADD VALUE 'PRESENCE_HOME';
ALTER TYPE "AutomationTriggerType" ADD VALUE 'PRESENCE_AWAY';
ALTER TYPE "AutomationTriggerType" ADD VALUE 'EVERYONE_AWAY';
ALTER TYPE "AutomationTriggerType" ADD VALUE 'ANYONE_HOME';

-- AlterTable
ALTER TABLE "AutomationTrigger" ADD COLUMN     "userId" UUID;

-- AlterTable
ALTER TABLE "NotificationPreference" ADD COLUMN     "presenceEventsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pushEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "HomePresence" (
    "id" UUID NOT NULL,
    "homeId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "PresenceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "source" "PresenceSource" NOT NULL DEFAULT 'SYSTEM',
    "lastChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomePresence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeGeofence" (
    "id" UUID NOT NULL,
    "homeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeGeofence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobileClient" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "clientInstanceId" TEXT NOT NULL,
    "platform" "MobilePlatform" NOT NULL,
    "appVersion" TEXT,
    "deviceLabel" TEXT,
    "pushProvider" "PushProvider",
    "pushTokenEncrypted" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresenceEvent" (
    "id" UUID NOT NULL,
    "homeId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "mobileClientId" UUID,
    "eventId" TEXT,
    "previousStatus" "PresenceStatus" NOT NULL,
    "newStatus" "PresenceStatus" NOT NULL,
    "source" "PresenceSource" NOT NULL,
    "eventType" "PresenceEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accuracyMeters" DOUBLE PRECISION,
    "distanceBand" TEXT,
    "correlationId" UUID,

    CONSTRAINT "PresenceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "mobileClientId" UUID NOT NULL,
    "channel" "DeliveryChannel" NOT NULL,
    "status" "DeliveryStatus" NOT NULL,
    "provider" "PushProvider",
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "errorCode" TEXT,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomePresence_homeId_status_idx" ON "HomePresence"("homeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "HomePresence_homeId_userId_key" ON "HomePresence"("homeId", "userId");

-- CreateIndex
CREATE INDEX "HomeGeofence_homeId_isEnabled_idx" ON "HomeGeofence"("homeId", "isEnabled");

-- CreateIndex
CREATE INDEX "MobileClient_userId_isActive_idx" ON "MobileClient"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MobileClient_userId_clientInstanceId_key" ON "MobileClient"("userId", "clientInstanceId");

-- CreateIndex
CREATE INDEX "PresenceEvent_homeId_userId_occurredAt_idx" ON "PresenceEvent"("homeId", "userId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "PresenceEvent_mobileClientId_eventId_key" ON "PresenceEvent"("mobileClientId", "eventId");

-- CreateIndex
CREATE INDEX "NotificationDelivery_status_attemptedAt_idx" ON "NotificationDelivery"("status", "attemptedAt");

-- CreateIndex
CREATE INDEX "NotificationDelivery_notificationId_idx" ON "NotificationDelivery"("notificationId");

-- AddForeignKey
ALTER TABLE "AutomationTrigger" ADD CONSTRAINT "AutomationTrigger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomePresence" ADD CONSTRAINT "HomePresence_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomePresence" ADD CONSTRAINT "HomePresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeGeofence" ADD CONSTRAINT "HomeGeofence_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeGeofence" ADD CONSTRAINT "HomeGeofence_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileClient" ADD CONSTRAINT "MobileClient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresenceEvent" ADD CONSTRAINT "PresenceEvent_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresenceEvent" ADD CONSTRAINT "PresenceEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresenceEvent" ADD CONSTRAINT "PresenceEvent_mobileClientId_fkey" FOREIGN KEY ("mobileClientId") REFERENCES "MobileClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_mobileClientId_fkey" FOREIGN KEY ("mobileClientId") REFERENCES "MobileClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HomeGeofence" ADD CONSTRAINT "HomeGeofence_ranges" CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180 AND "radiusMeters" BETWEEN 50 AND 2000);
CREATE FUNCTION enforce_presence_membership() RETURNS trigger AS $$ BEGIN IF NOT EXISTS(SELECT 1 FROM "HomeMembership" WHERE "homeId"=NEW."homeId" AND "userId"=NEW."userId") THEN RAISE EXCEPTION 'Presence user must be a Home member' USING ERRCODE='23514'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "HomePresence_membership_guard" BEFORE INSERT OR UPDATE OF "homeId","userId" ON "HomePresence" FOR EACH ROW EXECUTE FUNCTION enforce_presence_membership();
CREATE TRIGGER "PresenceEvent_membership_guard" BEFORE INSERT OR UPDATE OF "homeId","userId" ON "PresenceEvent" FOR EACH ROW EXECUTE FUNCTION enforce_presence_membership();
CREATE FUNCTION enforce_presence_trigger_home() RETURNS trigger AS $$ BEGIN IF NEW."userId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "Automation" a JOIN "HomeMembership" m ON m."homeId"=a."homeId" WHERE a.id=NEW."automationId" AND m."userId"=NEW."userId") THEN RAISE EXCEPTION 'Presence trigger user must belong to Automation Home' USING ERRCODE='23514'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "AutomationTrigger_presence_home_guard" BEFORE INSERT OR UPDATE OF "automationId","userId" ON "AutomationTrigger" FOR EACH ROW EXECUTE FUNCTION enforce_presence_trigger_home();
