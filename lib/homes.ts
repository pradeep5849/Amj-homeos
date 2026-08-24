import type { Role } from "@prisma/client";
import { prisma } from "./db";
import { HttpError } from "./errors";
import { normalizeRoomName } from "./validation";

type Actor = { id: string; role: Role };
export const homeSelect = { id: true, name: true, timezone: true, isArchived: true, createdAt: true, updatedAt: true } as const;
export const roomSelect = { id: true, homeId: true, name: true, createdAt: true, updatedAt: true } as const;

async function adminOwnsHome(adminId: string, homeId: string) {
  return Boolean(await prisma.homeMembership.findFirst({ where: { homeId, role: "OWNER", user: { role: "HOME_OWNER", homeOwnerProfile: { assignedAdminId: adminId } } }, select: { id: true } }));
}

export async function homeAccess(actor: Actor, homeId: string, manage = false) {
  const home = await prisma.home.findUnique({ where: { id: homeId }, select: { id: true, isArchived: true } });
  if (!home) throw new HttpError(404, "Home not found");
  if (actor.role === "SUPER_ADMIN" || (actor.role === "ADMIN" && await adminOwnsHome(actor.id, homeId))) return home;
  const membership = await prisma.homeMembership.findUnique({ where: { homeId_userId: { homeId, userId: actor.id } }, select: { role: true } });
  if (!membership || (manage && membership.role !== "OWNER")) throw new HttpError(403, "Forbidden");
  return home;
}

export async function createHome(actor: Actor, input: { targetHomeOwnerId: string; name: string; timezone: string }) {
  if (actor.role !== "ADMIN" && actor.role !== "SUPER_ADMIN") throw new HttpError(403, "Only an Admin can provision a Home");
  const owner = await prisma.user.findFirst({ where: { id: input.targetHomeOwnerId, role: "HOME_OWNER", isActive: true, ...(actor.role === "ADMIN" ? { homeOwnerProfile: { assignedAdminId: actor.id } } : {}) }, select: { id: true } });
  if (!owner) throw new HttpError(404, "Eligible Home Owner not found");
  return prisma.home.create({ data: { name: input.name.trim(), timezone: input.timezone, memberships: { create: { userId: owner.id, role: "OWNER" } } }, select: homeSelect });
}

export async function listHomes(actor: Actor) {
  const where = actor.role === "SUPER_ADMIN" ? {} : actor.role === "ADMIN"
    ? { memberships: { some: { role: "OWNER" as const, user: { role: "HOME_OWNER" as const, homeOwnerProfile: { assignedAdminId: actor.id } } } } }
    : { memberships: { some: { userId: actor.id } } };
  return prisma.home.findMany({ where: { ...where, isArchived: false }, select: { ...homeSelect, memberships: { where: { userId: actor.id }, select: { role: true } } }, orderBy: { createdAt: "asc" } });
}

export async function createRoom(actor: Actor, homeId: string, name: string) { await homeAccess(actor, homeId, true); return prisma.room.create({ data: { homeId, name: name.trim().replace(/\s+/g, " "), normalizedName: normalizeRoomName(name) }, select: roomSelect }); }
