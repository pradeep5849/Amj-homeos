CREATE TYPE "HomeMembershipRole" AS ENUM ('OWNER', 'MEMBER');

CREATE TABLE "Home" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "timezone" TEXT NOT NULL,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Home_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "HomeMembership" (
  "id" UUID NOT NULL,
  "homeId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "role" "HomeMembershipRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HomeMembership_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Room" (
  "id" UUID NOT NULL,
  "homeId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Home_isArchived_idx" ON "Home"("isArchived");
CREATE UNIQUE INDEX "HomeMembership_homeId_userId_key" ON "HomeMembership"("homeId", "userId");
CREATE INDEX "HomeMembership_userId_role_idx" ON "HomeMembership"("userId", "role");
CREATE UNIQUE INDEX "Room_homeId_normalizedName_key" ON "Room"("homeId", "normalizedName");
CREATE INDEX "Room_homeId_idx" ON "Room"("homeId");
ALTER TABLE "HomeMembership" ADD CONSTRAINT "HomeMembership_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HomeMembership" ADD CONSTRAINT "HomeMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Room" ADD CONSTRAINT "Room_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
