import bcrypt from "bcryptjs";
import { prisma } from "../lib/db";
import { bootstrapEnvSchema } from "../lib/env";
import { normalizeEmail } from "../lib/validation";

async function main() {
  const env = bootstrapEnvSchema.parse(process.env);
  const existing = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (existing) { console.log("Super Admin already exists; no changes made."); return; }
  const user = await prisma.user.create({ data: { email: env.SUPER_ADMIN_EMAIL.trim(), normalizedEmail: normalizeEmail(env.SUPER_ADMIN_EMAIL), passwordHash: await bcrypt.hash(env.SUPER_ADMIN_PASSWORD, 12), name: env.SUPER_ADMIN_NAME.trim(), role: "SUPER_ADMIN" }, select: { id: true, email: true } });
  console.log(`Super Admin created: ${user.email} (${user.id})`);
}
main().finally(() => prisma.$disconnect());
