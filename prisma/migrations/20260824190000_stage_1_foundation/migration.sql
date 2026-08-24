-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'HOME_OWNER');

-- CreateTable
CREATE TABLE "User" (
  "id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "normalizedEmail" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AdminProfile" (
  "userId" UUID NOT NULL,
  "isDefaultAdmin" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminProfile_pkey" PRIMARY KEY ("userId")
);
CREATE TABLE "HomeOwnerProfile" (
  "userId" UUID NOT NULL,
  "assignedAdminId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HomeOwnerProfile_pkey" PRIMARY KEY ("userId")
);
CREATE TABLE "Session" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_normalizedEmail_key" ON "User"("normalizedEmail");
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");
CREATE INDEX "HomeOwnerProfile_assignedAdminId_idx" ON "HomeOwnerProfile"("assignedAdminId");
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

ALTER TABLE "AdminProfile" ADD CONSTRAINT "AdminProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HomeOwnerProfile" ADD CONSTRAINT "HomeOwnerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HomeOwnerProfile" ADD CONSTRAINT "HomeOwnerProfile_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "AdminProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PostgreSQL-level SaaS invariants that Prisma's schema language cannot express.
CREATE UNIQUE INDEX "only_one_super_admin" ON "User" ((true)) WHERE "role" = 'SUPER_ADMIN';
CREATE UNIQUE INDEX "only_one_default_admin" ON "AdminProfile" ((true)) WHERE "isDefaultAdmin" = true;

CREATE FUNCTION enforce_profile_roles() RETURNS trigger AS $$
DECLARE expected_role "Role";
BEGIN
  expected_role := CASE TG_TABLE_NAME WHEN 'AdminProfile' THEN 'ADMIN'::"Role" ELSE 'HOME_OWNER'::"Role" END;
  IF NOT EXISTS (SELECT 1 FROM "User" WHERE "id" = NEW."userId" AND "role" = expected_role) THEN
    RAISE EXCEPTION '% requires user role %', TG_TABLE_NAME, expected_role USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AdminProfile_role_guard" BEFORE INSERT OR UPDATE OF "userId" ON "AdminProfile"
FOR EACH ROW EXECUTE FUNCTION enforce_profile_roles();
CREATE TRIGGER "HomeOwnerProfile_role_guard" BEFORE INSERT OR UPDATE OF "userId" ON "HomeOwnerProfile"
FOR EACH ROW EXECUTE FUNCTION enforce_profile_roles();

CREATE FUNCTION enforce_default_admin_active() RETURNS trigger AS $$
BEGIN
  IF NEW."isDefaultAdmin" AND NOT EXISTS (
    SELECT 1 FROM "User" WHERE "id" = NEW."userId" AND "role" = 'ADMIN' AND "isActive" = true
  ) THEN
    RAISE EXCEPTION 'default Admin must be an active ADMIN' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "default_admin_active_guard" BEFORE INSERT OR UPDATE ON "AdminProfile"
FOR EACH ROW EXECUTE FUNCTION enforce_default_admin_active();

CREATE FUNCTION guard_user_role_and_default_status() RETURNS trigger AS $$
BEGIN
  IF OLD."role" <> NEW."role" THEN
    RAISE EXCEPTION 'user roles are immutable' USING ERRCODE = '23514';
  END IF;
  IF OLD."isActive" AND NOT NEW."isActive" AND EXISTS (
    SELECT 1 FROM "AdminProfile" WHERE "userId" = NEW."id" AND "isDefaultAdmin" = true
  ) THEN
    RAISE EXCEPTION 'default Admin cannot be deactivated' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "user_role_default_guard" BEFORE UPDATE OF "role", "isActive" ON "User"
FOR EACH ROW EXECUTE FUNCTION guard_user_role_and_default_status();
