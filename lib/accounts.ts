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
  const user = await prisma.user.findUnique({ where: { normalizedEmail: normalizeEmail(email) } });
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, "Invalid email or password");
  return user;
}

export type TransactionClient = Prisma.TransactionClient;
