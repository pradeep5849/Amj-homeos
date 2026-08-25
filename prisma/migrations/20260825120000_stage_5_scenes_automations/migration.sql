-- CreateEnum
CREATE TYPE "LogicalCommand" AS ENUM ('setPower', 'setBrightness', 'setSpeed');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'PARTIAL_FAILURE', 'FAILED');

-- CreateEnum
CREATE TYPE "AutomationTriggerType" AS ENUM ('MANUAL', 'DEVICE_STATE');

-- CreateEnum
CREATE TYPE "TriggerOperator" AS ENUM ('EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'GREATER_THAN_OR_EQUAL', 'LESS_THAN', 'LESS_THAN_OR_EQUAL');

-- DropForeignKey
ALTER TABLE "DeviceOnboardingSession" DROP CONSTRAINT "DeviceOnboardingSession_roomId_fkey";

-- CreateTable
CREATE TABLE "Scene" (
    "id" UUID NOT NULL,
    "homeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneAction" (
    "id" UUID NOT NULL,
    "sceneId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "command" "LogicalCommand" NOT NULL,
    "value" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SceneAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneExecution" (
    "id" UUID NOT NULL,
    "sceneId" UUID NOT NULL,
    "homeId" UUID NOT NULL,
    "initiatedByUserId" UUID,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorSummary" TEXT,

    CONSTRAINT "SceneExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneActionExecution" (
    "id" UUID NOT NULL,
    "sceneExecutionId" UUID NOT NULL,
    "sceneActionId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "status" "ExecutionStatus" NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SceneActionExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Automation" (
    "id" UUID NOT NULL,
    "homeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationTrigger" (
    "id" UUID NOT NULL,
    "automationId" UUID NOT NULL,
    "triggerType" "AutomationTriggerType" NOT NULL,
    "deviceId" UUID,
    "capability" TEXT,
    "operator" "TriggerOperator",
    "value" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationAction" (
    "id" UUID NOT NULL,
    "automationId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "command" "LogicalCommand" NOT NULL,
    "value" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationExecution" (
    "id" UUID NOT NULL,
    "automationId" UUID NOT NULL,
    "homeId" UUID NOT NULL,
    "triggerType" "AutomationTriggerType" NOT NULL,
    "triggerDeviceId" UUID,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "correlationId" UUID NOT NULL,
    "chainDepth" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorSummary" TEXT,

    CONSTRAINT "AutomationExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationActionExecution" (
    "id" UUID NOT NULL,
    "automationExecutionId" UUID NOT NULL,
    "automationActionId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "status" "ExecutionStatus" NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationActionExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Scene_homeId_isArchived_idx" ON "Scene"("homeId", "isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "Scene_homeId_normalizedName_key" ON "Scene"("homeId", "normalizedName");

-- CreateIndex
CREATE INDEX "SceneAction_deviceId_idx" ON "SceneAction"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "SceneAction_sceneId_sortOrder_key" ON "SceneAction"("sceneId", "sortOrder");

-- CreateIndex
CREATE INDEX "SceneExecution_sceneId_startedAt_idx" ON "SceneExecution"("sceneId", "startedAt");

-- CreateIndex
CREATE INDEX "SceneExecution_homeId_startedAt_idx" ON "SceneExecution"("homeId", "startedAt");

-- CreateIndex
CREATE INDEX "SceneActionExecution_sceneExecutionId_idx" ON "SceneActionExecution"("sceneExecutionId");

-- CreateIndex
CREATE INDEX "Automation_homeId_isArchived_isEnabled_idx" ON "Automation"("homeId", "isArchived", "isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "Automation_homeId_normalizedName_key" ON "Automation"("homeId", "normalizedName");

-- CreateIndex
CREATE INDEX "AutomationTrigger_automationId_triggerType_idx" ON "AutomationTrigger"("automationId", "triggerType");

-- CreateIndex
CREATE INDEX "AutomationTrigger_deviceId_capability_idx" ON "AutomationTrigger"("deviceId", "capability");

-- CreateIndex
CREATE INDEX "AutomationAction_deviceId_idx" ON "AutomationAction"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationAction_automationId_sortOrder_key" ON "AutomationAction"("automationId", "sortOrder");

-- CreateIndex
CREATE INDEX "AutomationExecution_automationId_startedAt_idx" ON "AutomationExecution"("automationId", "startedAt");

-- CreateIndex
CREATE INDEX "AutomationExecution_correlationId_idx" ON "AutomationExecution"("correlationId");

-- CreateIndex
CREATE INDEX "AutomationActionExecution_automationExecutionId_idx" ON "AutomationActionExecution"("automationExecutionId");

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneAction" ADD CONSTRAINT "SceneAction_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneAction" ADD CONSTRAINT "SceneAction_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneExecution" ADD CONSTRAINT "SceneExecution_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneExecution" ADD CONSTRAINT "SceneExecution_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneExecution" ADD CONSTRAINT "SceneExecution_initiatedByUserId_fkey" FOREIGN KEY ("initiatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneActionExecution" ADD CONSTRAINT "SceneActionExecution_sceneExecutionId_fkey" FOREIGN KEY ("sceneExecutionId") REFERENCES "SceneExecution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneActionExecution" ADD CONSTRAINT "SceneActionExecution_sceneActionId_fkey" FOREIGN KEY ("sceneActionId") REFERENCES "SceneAction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneActionExecution" ADD CONSTRAINT "SceneActionExecution_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationTrigger" ADD CONSTRAINT "AutomationTrigger_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationTrigger" ADD CONSTRAINT "AutomationTrigger_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationAction" ADD CONSTRAINT "AutomationAction_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationAction" ADD CONSTRAINT "AutomationAction_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_triggerDeviceId_fkey" FOREIGN KEY ("triggerDeviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationActionExecution" ADD CONSTRAINT "AutomationActionExecution_automationExecutionId_fkey" FOREIGN KEY ("automationExecutionId") REFERENCES "AutomationExecution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationActionExecution" ADD CONSTRAINT "AutomationActionExecution_automationActionId_fkey" FOREIGN KEY ("automationActionId") REFERENCES "AutomationAction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationActionExecution" ADD CONSTRAINT "AutomationActionExecution_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE FUNCTION enforce_scene_action_home() RETURNS trigger AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM "Scene" s JOIN "Device" d ON d."id"=NEW."deviceId" WHERE s."id"=NEW."sceneId" AND s."homeId"=d."homeId") THEN RAISE EXCEPTION 'Scene action Device must belong to Scene Home' USING ERRCODE='23514'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "SceneAction_home_guard" BEFORE INSERT OR UPDATE OF "sceneId","deviceId" ON "SceneAction" FOR EACH ROW EXECUTE FUNCTION enforce_scene_action_home();
CREATE FUNCTION enforce_automation_action_home() RETURNS trigger AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM "Automation" a JOIN "Device" d ON d."id"=NEW."deviceId" WHERE a."id"=NEW."automationId" AND a."homeId"=d."homeId") THEN RAISE EXCEPTION 'Automation action Device must belong to Automation Home' USING ERRCODE='23514'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "AutomationAction_home_guard" BEFORE INSERT OR UPDATE OF "automationId","deviceId" ON "AutomationAction" FOR EACH ROW EXECUTE FUNCTION enforce_automation_action_home();
CREATE FUNCTION enforce_automation_trigger_home() RETURNS trigger AS $$ BEGIN
 IF NEW."deviceId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "Automation" a JOIN "Device" d ON d."id"=NEW."deviceId" WHERE a."id"=NEW."automationId" AND a."homeId"=d."homeId") THEN RAISE EXCEPTION 'Automation trigger Device must belong to Automation Home' USING ERRCODE='23514'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "AutomationTrigger_home_guard" BEFORE INSERT OR UPDATE OF "automationId","deviceId" ON "AutomationTrigger" FOR EACH ROW EXECUTE FUNCTION enforce_automation_trigger_home();
