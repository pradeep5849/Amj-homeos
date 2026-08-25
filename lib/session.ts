import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { prisma } from "./db";
import { HttpError } from "./errors";
import { hashToken, newRawToken } from "./token";

export const SESSION_COOKIE = "amj_homeos_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
export async function createSession(userId: string) {
  const token = newRawToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
  return expiresAt;
}

export async function clearSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) { const session=await prisma.session.findUnique({where:{tokenHash:hashToken(token)},select:{id:true,userId:true}}); if(session) await prisma.$transaction([prisma.session.delete({where:{id:session.id}}),prisma.securityAuditEvent.create({data:{userId:session.userId,actorUserId:session.userId,eventType:"LOGOUT"}})]); }
  store.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

export async function currentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { homeOwnerProfile: { include: { assignedAdmin: { include: { user: { select: { id: true, name: true } } } } } } } } },
  });
  if (!session || session.expiresAt <= new Date() || !session.user.isActive) {
    if (session) await prisma.session.delete({ where: { id: session.id } });
    return null;
  }
  await prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } });
  return session.user;
}

export async function requireUser() { const user = await currentUser(); if (!user) throw new HttpError(401, "Authentication required"); return user; }
export async function requireRole(...roles: Role[]) { const user = await requireUser(); if (!roles.includes(user.role)) throw new HttpError(403, "Forbidden"); return user; }
export async function requireSuperAdmin() { return requireRole("SUPER_ADMIN"); }
export async function requireAdmin() { return requireRole("ADMIN"); }

export async function verifyHomeOwnerAccess(homeOwnerId: string) {
  const actor = await requireUser();
  if (actor.role === "SUPER_ADMIN" || (actor.role === "HOME_OWNER" && actor.id === homeOwnerId)) return actor;
  if (actor.role === "ADMIN") {
    const owns = await prisma.homeOwnerProfile.count({ where: { userId: homeOwnerId, assignedAdminId: actor.id } });
    if (owns) return actor;
  }
  throw new HttpError(403, "Forbidden");
}
