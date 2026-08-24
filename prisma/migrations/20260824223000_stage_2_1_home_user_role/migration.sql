ALTER TYPE "Role" ADD VALUE 'HOME_USER';

CREATE FUNCTION enforce_home_membership_role() RETURNS trigger AS $$
BEGIN
  IF NEW."role" = 'OWNER' AND NOT EXISTS (
    SELECT 1 FROM "User" WHERE "id" = NEW."userId" AND "role" = 'HOME_OWNER'
  ) THEN
    RAISE EXCEPTION 'OWNER membership requires HOME_OWNER platform role' USING ERRCODE = '23514';
  END IF;
  IF NEW."role" = 'MEMBER' AND NOT EXISTS (
    SELECT 1 FROM "User" WHERE "id" = NEW."userId" AND "role" IN ('HOME_OWNER', 'HOME_USER')
  ) THEN
    RAISE EXCEPTION 'MEMBER membership requires HOME_OWNER or HOME_USER platform role' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "HomeMembership_role_guard"
BEFORE INSERT OR UPDATE OF "userId", "role" ON "HomeMembership"
FOR EACH ROW EXECUTE FUNCTION enforce_home_membership_role();
