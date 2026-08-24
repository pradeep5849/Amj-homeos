import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

const enabled = Boolean(process.env.DATABASE_TEST_URL);
describe.skipIf(!enabled)("PostgreSQL constraints", () => {
  let prisma: PrismaClient;
  beforeAll(() => { prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_TEST_URL! } } }); });
  afterAll(async () => prisma?.$disconnect());
  it("connects to the disposable migrated database", async () => expect(await prisma.$queryRaw`SELECT 1 AS value`).toEqual([{ value: 1 }]));
});
