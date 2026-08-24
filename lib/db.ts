import { PrismaClient } from "@prisma/client";
import { getEnv } from "./env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
getEnv();
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
