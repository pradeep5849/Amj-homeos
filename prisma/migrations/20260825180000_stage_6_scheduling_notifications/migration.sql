-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('ONCE', 'DAILY', 'WEEKLY', 'SUNRISE', 'SUNSET');

-- CreateEnum
CREATE TYPE "TimerTargetType" AS ENUM ('DEVICE_COMMAND', 'SCENE');

-- CreateEnum
CREATE TYPE "TimerStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DEVICE', 'AUTOMATION', 'SCENE', 'SCHEDULE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR');

-- AlterEnum
ALTER TYPE "AutomationTriggerType" ADD VALUE 'SCHEDULE';

-- AlterTable
ALTER TABLE "Home" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "AutomationSchedule" (
    "id" UUID NOT NULL,
    "automationId" UUID NOT NULL,
    "scheduleType" "ScheduleType" NOT NULL,
    "localTime" TEXT,
    "daysOfWeek" JSONB,
    "offsetMinutes" INTEGER,
    "runAt" TIMESTAMP(3),
    "timezoneSnapshot" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "claimToken" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timer" (
    "id" UUID NOT NULL,
    "homeId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "targetType" "TimerTargetType" NOT NULL,
    "deviceId" UUID,
    "sceneId" UUID,
    "command" "LogicalCommand",
    "value" JSONB,
    "runAt" TIMESTAMP(3) NOT NULL,
    "status" "TimerStatus" NOT NULL DEFAULT 'PENDING',
    "claimedAt" TIMESTAMP(3),
    "claimToken" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "errorSummary" TEXT,

    CONSTRAINT "Timer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "homeId" UUID,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "userId" UUID NOT NULL,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "deviceEventsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "automationEventsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "scheduleEventsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "systemEventsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "AutomationSchedule_isEnabled_nextRunAt_idx" ON "AutomationSchedule"("isEnabled", "nextRunAt");

-- CreateIndex
CREATE INDEX "AutomationSchedule_claimedAt_idx" ON "AutomationSchedule"("claimedAt");

-- CreateIndex
CREATE INDEX "Timer_status_runAt_idx" ON "Timer"("status", "runAt");

-- CreateIndex
CREATE INDEX "Timer_claimedAt_idx" ON "Timer"("claimedAt");

-- CreateIndex
CREATE INDEX "Timer_homeId_status_idx" ON "Timer"("homeId", "status");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_homeId_createdAt_idx" ON "Notification"("homeId", "createdAt");

-- AddForeignKey
ALTER TABLE "AutomationSchedule" ADD CONSTRAINT "AutomationSchedule_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timer" ADD CONSTRAINT "Timer_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timer" ADD CONSTRAINT "Timer_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timer" ADD CONSTRAINT "Timer_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timer" ADD CONSTRAINT "Timer_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Home" ADD CONSTRAINT "Home_latitude_range" CHECK (latitude IS NULL OR (latitude>=-90 AND latitude<=90));
ALTER TABLE "Home" ADD CONSTRAINT "Home_longitude_range" CHECK (longitude IS NULL OR (longitude>=-180 AND longitude<=180));
ALTER TABLE "Timer" ADD CONSTRAINT "Timer_target_shape" CHECK (("targetType"='DEVICE_COMMAND' AND "deviceId" IS NOT NULL AND "sceneId" IS NULL AND command IS NOT NULL AND value IS NOT NULL) OR ("targetType"='SCENE' AND "sceneId" IS NOT NULL AND "deviceId" IS NULL AND command IS NULL AND value IS NULL));
CREATE FUNCTION enforce_timer_home() RETURNS trigger AS $$ BEGIN
 IF NEW."deviceId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "Device" WHERE id=NEW."deviceId" AND "homeId"=NEW."homeId") THEN RAISE EXCEPTION 'Timer Device must belong to Home' USING ERRCODE='23514'; END IF;
 IF NEW."sceneId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "Scene" WHERE id=NEW."sceneId" AND "homeId"=NEW."homeId") THEN RAISE EXCEPTION 'Timer Scene must belong to Home' USING ERRCODE='23514'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "Timer_home_guard" BEFORE INSERT OR UPDATE OF "homeId","deviceId","sceneId" ON "Timer" FOR EACH ROW EXECUTE FUNCTION enforce_timer_home();
