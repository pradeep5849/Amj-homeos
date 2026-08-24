import { describe, expect, it } from "vitest";
import { addHomeMemberSchema, createAdminSchema, createHomeOwnerSchema, createHomeSchema, createRoomSchema, normalizeRoomName, registerSchema } from "@/lib/validation";
import { canAccessHomeOwner, canCreateAdmin, canCreateHomeOwner } from "@/lib/policy";
import { hashToken, newRawToken } from "@/lib/token";
import fs from "node:fs";

const valid = { name: "Home Owner", email: "owner@example.com", password: "a-secure-passphrase" };
describe("Stage 1 account boundaries", () => {
  it("direct registration accepts only HOME_OWNER fields", () => expect(registerSchema.parse(valid)).toEqual(valid));
  it("rejects role injection", () => expect(() => registerSchema.parse({ ...valid, role: "SUPER_ADMIN" })).toThrow());
  it("rejects assigned Admin injection", () => expect(() => registerSchema.parse({ ...valid, assignedAdminId: "admin-2" })).toThrow());
  it("rejects default Admin injection", () => expect(() => registerSchema.parse({ ...valid, isDefaultAdmin: true })).toThrow());
  it("Admin-created customers cannot override assignment", () => expect(() => createHomeOwnerSchema.parse({ ...valid, assignedAdminId: "admin-2" })).toThrow());
  it("only Super Admin may create Admins", () => { expect(canCreateAdmin("SUPER_ADMIN")).toBe(true); expect(canCreateAdmin("ADMIN")).toBe(false); expect(canCreateAdmin("HOME_OWNER")).toBe(false); });
  it("only Admin may use controlled customer creation", () => { expect(canCreateHomeOwner("ADMIN")).toBe(true); expect(canCreateHomeOwner("SUPER_ADMIN")).toBe(false); expect(canCreateHomeOwner("HOME_OWNER")).toBe(false); });
  it("Admin 1 cannot access Admin 2's customer", () => expect(canAccessHomeOwner({ id: "admin-1", role: "ADMIN" }, { id: "owner-2", assignedAdminId: "admin-2" })).toBe(false));
  it("an Admin can access its own customer", () => expect(canAccessHomeOwner({ id: "admin-1", role: "ADMIN" }, { id: "owner-1", assignedAdminId: "admin-1" })).toBe(true));
  it("Super Admin can view customers across Admins", () => expect(canAccessHomeOwner({ id: "super", role: "SUPER_ADMIN" }, { id: "owner-2", assignedAdminId: "admin-2" })).toBe(true));
  it("Home Owner cannot access another customer", () => expect(canAccessHomeOwner({ id: "owner-1", role: "HOME_OWNER" }, { id: "owner-2", assignedAdminId: "admin-1" })).toBe(false));
  it("Home Owner can access itself", () => expect(canAccessHomeOwner({ id: "owner-1", role: "HOME_OWNER" }, { id: "owner-1", assignedAdminId: "admin-1" })).toBe(true));
  it("Admin creation rejects role fields", () => expect(() => createAdminSchema.parse({ ...valid, role: "SUPER_ADMIN" })).toThrow());
});

describe("session security", () => {
  it("creates high-entropy random tokens and hashes before persistence", () => { const token = newRawToken(); expect(token.length).toBeGreaterThan(40); expect(hashToken(token)).toMatch(/^[a-f0-9]{64}$/); expect(hashToken(token)).not.toContain(token); });
  it("does not repeat tokens", () => expect(newRawToken()).not.toBe(newRawToken()));
});

describe("Stage 2 input boundaries", () => {
  const id = "3d594650-3436-4c9b-8545-bf29624e4149";
  it("validates IANA timezones", () => expect(createHomeSchema.parse({ targetHomeOwnerId: id, name: "Hassan House", timezone: "Asia/Kolkata" }).timezone).toBe("Asia/Kolkata"));
  it("rejects invalid timezones", () => expect(() => createHomeSchema.parse({ targetHomeOwnerId: id, name: "House", timezone: "Mars/Olympus" })).toThrow());
  it("rejects owner and Admin injection", () => expect(() => createHomeSchema.parse({ targetHomeOwnerId: id, name: "House", timezone: "UTC", assignedAdminId: "x", role: "OWNER" })).toThrow());
  it("normalizes room names consistently", () => expect(normalizeRoomName("  KITCHEN  ")).toBe("kitchen"));
  it("rejects room field injection", () => expect(() => createRoomSchema.parse({ name: "Kitchen", homeId: "other" })).toThrow());
  it("membership input cannot choose a role", () => expect(() => addHomeMemberSchema.parse({ userId: id, role: "OWNER" })).toThrow());
});

describe("database invariant migration", () => {
  const sql = fs.readFileSync("prisma/migrations/20260824190000_stage_1_foundation/migration.sql", "utf8");
  it("limits Super Admin and default Admin uniqueness", () => { expect(sql).toContain("only_one_super_admin"); expect(sql).toContain("only_one_default_admin"); });
  it("requires active default Admin and immutable roles", () => { expect(sql).toContain("default Admin must be an active ADMIN"); expect(sql).toContain("user roles are immutable"); });
  it("guards profile roles", () => { expect(sql).toContain("AdminProfile_role_guard"); expect(sql).toContain("HomeOwnerProfile_role_guard"); });
  it("restricts deletion of assigned Admins", () => expect(sql).toContain('REFERENCES "AdminProfile"("userId") ON DELETE RESTRICT'));
  it("uniquely indexes session token hashes", () => expect(sql).toContain('CREATE UNIQUE INDEX "Session_tokenHash_key"'));
});
