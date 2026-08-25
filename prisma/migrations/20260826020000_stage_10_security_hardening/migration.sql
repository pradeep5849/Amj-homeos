CREATE TYPE "SecurityAuditEventType" AS ENUM ('LOGIN_SUCCESS','LOGIN_FAILURE','LOGOUT','PASSWORD_CHANGED','SESSION_REVOKED','SESSIONS_REVOKED');
CREATE TABLE "SecurityAuditEvent" (
 "id" UUID NOT NULL,"userId" UUID,"homeId" UUID,"actorUserId" UUID,"eventType" "SecurityAuditEventType" NOT NULL,"occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "SecurityAuditEvent_pkey" PRIMARY KEY("id"),
 CONSTRAINT "SecurityAuditEvent_userId_fkey" FOREIGN KEY("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "SecurityAuditEvent_homeId_fkey" FOREIGN KEY("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "SecurityAuditEvent_actorUserId_fkey" FOREIGN KEY("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "SecurityAuditEvent_userId_occurredAt_idx" ON "SecurityAuditEvent"("userId","occurredAt");
CREATE INDEX "SecurityAuditEvent_homeId_occurredAt_idx" ON "SecurityAuditEvent"("homeId","occurredAt");
CREATE INDEX "SecurityAuditEvent_occurredAt_idx" ON "SecurityAuditEvent"("occurredAt");
CREATE TABLE "LoginAbuseState"("normalizedIdentifier" TEXT NOT NULL,"failureCount" INTEGER NOT NULL DEFAULT 0,"windowStartedAt" TIMESTAMP(3) NOT NULL,"lockedUntil" TIMESTAMP(3),"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "LoginAbuseState_pkey" PRIMARY KEY("normalizedIdentifier"),CONSTRAINT "LoginAbuseState_failureCount_check" CHECK("failureCount">=0 AND "failureCount"<=5));
CREATE INDEX "LoginAbuseState_lockedUntil_idx" ON "LoginAbuseState"("lockedUntil");
