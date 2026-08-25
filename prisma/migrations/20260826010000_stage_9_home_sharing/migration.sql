CREATE TYPE "HomeInvitationStatus" AS ENUM ('PENDING','ACCEPTED','REJECTED','CANCELLED','EXPIRED');
CREATE TYPE "HomeSharingAuditType" AS ENUM ('INVITATION_CREATED','INVITATION_ACCEPTED','INVITATION_REJECTED','INVITATION_CANCELLED','INVITATION_EXPIRED','MEMBER_REMOVED','MEMBER_LEFT');
CREATE TABLE "HomeInvitation" (
  "id" UUID NOT NULL, "homeId" UUID NOT NULL, "normalizedEmail" TEXT NOT NULL,
  "role" "HomeMembershipRole" NOT NULL DEFAULT 'MEMBER', "status" "HomeInvitationStatus" NOT NULL DEFAULT 'PENDING',
  "tokenHash" TEXT NOT NULL, "invitedByUserId" UUID NOT NULL, "acceptedByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3), "rejectedAt" TIMESTAMP(3), "cancelledAt" TIMESTAMP(3),
  CONSTRAINT "HomeInvitation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HomeInvitation_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "HomeInvitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "HomeInvitation_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "invitation_member_only" CHECK ("role" = 'MEMBER'),
  CONSTRAINT "invitation_state_fields" CHECK (
    ("status"='PENDING' AND "acceptedByUserId" IS NULL AND "acceptedAt" IS NULL AND "rejectedAt" IS NULL AND "cancelledAt" IS NULL) OR
    ("status"='ACCEPTED' AND "acceptedByUserId" IS NOT NULL AND "acceptedAt" IS NOT NULL AND "rejectedAt" IS NULL AND "cancelledAt" IS NULL) OR
    ("status"='REJECTED' AND "acceptedByUserId" IS NULL AND "acceptedAt" IS NULL AND "rejectedAt" IS NOT NULL AND "cancelledAt" IS NULL) OR
    ("status"='CANCELLED' AND "acceptedByUserId" IS NULL AND "acceptedAt" IS NULL AND "rejectedAt" IS NULL AND "cancelledAt" IS NOT NULL) OR
    ("status"='EXPIRED' AND "acceptedByUserId" IS NULL AND "acceptedAt" IS NULL AND "rejectedAt" IS NULL AND "cancelledAt" IS NULL)
  )
);
CREATE UNIQUE INDEX "HomeInvitation_tokenHash_key" ON "HomeInvitation"("tokenHash");
CREATE UNIQUE INDEX "HomeInvitation_one_pending_email_per_home" ON "HomeInvitation"("homeId","normalizedEmail") WHERE "status"='PENDING';
CREATE INDEX "HomeInvitation_homeId_status_createdAt_idx" ON "HomeInvitation"("homeId","status","createdAt");
CREATE INDEX "HomeInvitation_normalizedEmail_status_expiresAt_idx" ON "HomeInvitation"("normalizedEmail","status","expiresAt");
CREATE INDEX "HomeInvitation_status_expiresAt_idx" ON "HomeInvitation"("status","expiresAt");
CREATE TABLE "HomeSharingAudit" (
  "id" UUID NOT NULL, "homeId" UUID NOT NULL, "actorUserId" UUID, "affectedUserId" UUID, "invitationId" UUID,
  "eventType" "HomeSharingAuditType" NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HomeSharingAudit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HomeSharingAudit_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "HomeSharingAudit_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "HomeSharingAudit_affectedUserId_fkey" FOREIGN KEY ("affectedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "HomeSharingAudit_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "HomeInvitation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "HomeSharingAudit_homeId_createdAt_idx" ON "HomeSharingAudit"("homeId","createdAt");
CREATE INDEX "HomeSharingAudit_invitationId_idx" ON "HomeSharingAudit"("invitationId");

CREATE OR REPLACE FUNCTION protect_home_owner_and_membership_scope() RETURNS trigger AS $$
BEGIN
  IF TG_OP='UPDATE' AND NEW."homeId" <> OLD."homeId" THEN RAISE EXCEPTION 'membership Home cannot change'; END IF;
  IF OLD."role"='OWNER' AND (TG_OP='DELETE' OR NEW."role"<>'OWNER') AND
     (SELECT count(*) FROM "HomeMembership" WHERE "homeId"=OLD."homeId" AND "role"='OWNER' AND "id"<>OLD."id")=0
  THEN RAISE EXCEPTION 'Home must retain an OWNER'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "protect_home_owner_and_membership_scope" BEFORE DELETE OR UPDATE ON "HomeMembership" FOR EACH ROW EXECUTE FUNCTION protect_home_owner_and_membership_scope();
