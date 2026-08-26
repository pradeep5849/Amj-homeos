const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) throw new Error(`${name} is required`);
  return value.trim();
}

async function main() {
  const email = requireEnv("SUPER_ADMIN_EMAIL");
  const password = requireEnv("SUPER_ADMIN_PASSWORD");
  const name = requireEnv("SUPER_ADMIN_NAME");
  if (password.length < 12) throw new Error("SUPER_ADMIN_PASSWORD must be at least 12 characters");
  if (name.length < 2 || name.length > 100) throw new Error("SUPER_ADMIN_NAME must be 2-100 characters");

  const existing = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (existing) {
    console.log("Super Admin already exists; no changes made.");
    return;
  }

  const normalizedEmail = email.toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, normalizedEmail, passwordHash, name, role: "SUPER_ADMIN" },
    select: { id: true, email: true },
  });
  console.log(`Super Admin created: ${user.email} (${user.id})`);
}

main()
  .catch((error) => {
    console.error("Super Admin bootstrap failed:", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
