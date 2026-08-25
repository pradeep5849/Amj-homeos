import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { HttpError } from "./errors";
import { normalizeEmail } from "./validation";
import { publicUserSelect } from "./public-user";

type NewAccount = { name: string; email: string; password: string };

export async function registerHomeOwner(input: NewAccount) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  return prisma.$transaction(async (tx) => {
    const admin = await tx.adminProfile.findFirst({ where: { isDefaultAdmin: true, user: { isActive: true, role: "ADMIN" } }, select: { userId: true } });
    if (!admin) throw new HttpError(503, "Registration is temporarily unavailable");
    return tx.user.create({
      data: { email: input.email.trim(), normalizedEmail: normalizeEmail(input.email), passwordHash, name: input.name.trim(), role: "HOME_OWNER", homeOwnerProfile: { create: { assignedAdminId: admin.userId } } },
      select: publicUserSelect,
    });
  }, { isolationLevel: "Serializable" });
}

export async function createHomeOwnerForAdmin(input: NewAccount, adminId: string) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  return prisma.user.create({
    data: { email: input.email.trim(), normalizedEmail: normalizeEmail(input.email), passwordHash, name: input.name.trim(), role: "HOME_OWNER", homeOwnerProfile: { create: { assignedAdminId: adminId } } },
    select: publicUserSelect,
  });
}

export async function createAdmin(input: NewAccount & { isDefaultAdmin?: boolean }) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  return prisma.$transaction(async (tx) => {
    if (input.isDefaultAdmin) await tx.adminProfile.updateMany({ where: { isDefaultAdmin: true }, data: { isDefaultAdmin: false } });
    return tx.user.create({
      data: { email: input.email.trim(), normalizedEmail: normalizeEmail(input.email), passwordHash, name: input.name.trim(), role: "ADMIN", adminProfile: { create: { isDefaultAdmin: input.isDefaultAdmin ?? false } } },
      select: { ...publicUserSelect, adminProfile: { select: { isDefaultAdmin: true } } },
    });
  }, { isolationLevel: "Serializable" });
}

export async function updateAdmin(id: string, input: { name?: string; isActive?: boolean; isDefaultAdmin?: boolean }) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findFirst({ where: { id, role: "ADMIN" }, include: { adminProfile: true } });
    if (!existing?.adminProfile) throw new HttpError(404, "Admin not found");
    if (input.isDefaultAdmin === false && existing.adminProfile.isDefaultAdmin) throw new HttpError(409, "Choose another default Admin instead");
    if (input.isDefaultAdmin && input.isActive === false) throw new HttpError(400, "Default Admin must be active");
    if (input.isDefaultAdmin) {
      await tx.adminProfile.updateMany({ where: { isDefaultAdmin: true, NOT: { userId: id } }, data: { isDefaultAdmin: false } });
      await tx.adminProfile.update({ where: { userId: id }, data: { isDefaultAdmin: true } });
    }
    return tx.user.update({ where: { id }, data: { name: input.name, isActive: input.isActive }, select: { ...publicUserSelect, adminProfile: { select: { isDefaultAdmin: true } } } });
  }, { isolationLevel: "Serializable" });
}

export async function authenticate(email: string, password: string) {
  const normalizedIdentifier=normalizeEmail(email),now=new Date(),user=await prisma.user.findUnique({where:{normalizedEmail:normalizedIdentifier}});
  if(await loginLocked(normalizedIdentifier,now)){await prisma.securityAuditEvent.create({data:{userId:user?.id,eventType:"LOGIN_FAILURE"}});throw new HttpError(401,"Invalid email or password")}
  if(!user||!user.isActive||!(await bcrypt.compare(password,user.passwordHash))){await recordLoginFailure(normalizedIdentifier,now);await prisma.securityAuditEvent.create({data:{userId:user?.id,eventType:"LOGIN_FAILURE"}});throw new HttpError(401,"Invalid email or password")}
  await prisma.$transaction([prisma.loginAbuseState.deleteMany({where:{normalizedIdentifier}}),prisma.securityAuditEvent.create({data:{userId:user.id,actorUserId:user.id,eventType:"LOGIN_SUCCESS"}})]);
  return user;
}

export type TransactionClient = Prisma.TransactionClient;

export const LOGIN_FAILURE_LIMIT=5,LOGIN_WINDOW_MS=15*60_000,LOGIN_LOCK_MS=15*60_000;
async function loginLocked(normalizedIdentifier:string,now=new Date()){const state=await prisma.loginAbuseState.findUnique({where:{normalizedIdentifier}});return Boolean(state?.lockedUntil&&state.lockedUntil>now)}
async function recordLoginFailure(normalizedIdentifier:string,now=new Date()){
 const windowStart=new Date(now.getTime()-LOGIN_WINDOW_MS),lockUntil=new Date(now.getTime()+LOGIN_LOCK_MS);
 await prisma.$executeRaw`INSERT INTO "LoginAbuseState" ("normalizedIdentifier","failureCount","windowStartedAt","lockedUntil","updatedAt") VALUES (${normalizedIdentifier},1,${now},NULL,${now}) ON CONFLICT ("normalizedIdentifier") DO UPDATE SET "failureCount"=CASE WHEN "LoginAbuseState"."windowStartedAt" < ${windowStart} THEN 1 ELSE LEAST(${LOGIN_FAILURE_LIMIT},"LoginAbuseState"."failureCount"+1) END,"windowStartedAt"=CASE WHEN "LoginAbuseState"."windowStartedAt" < ${windowStart} THEN ${now} ELSE "LoginAbuseState"."windowStartedAt" END,"lockedUntil"=CASE WHEN "LoginAbuseState"."windowStartedAt">=${windowStart} AND "LoginAbuseState"."failureCount"+1>=${LOGIN_FAILURE_LIMIT} THEN ${lockUntil} ELSE NULL END,"updatedAt"=${now}`;
}
