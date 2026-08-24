import type { Role } from "@prisma/client";

export function canCreateAdmin(role: Role) { return role === "SUPER_ADMIN"; }
export function canCreateHomeOwner(role: Role) { return role === "ADMIN"; }
export function canAccessHomeOwner(actor: { id: string; role: Role }, owner: { id: string; assignedAdminId: string }) {
  return actor.role === "SUPER_ADMIN" || (actor.role === "ADMIN" && actor.id === owner.assignedAdminId) || (actor.role === "HOME_OWNER" && actor.id === owner.id);
}
