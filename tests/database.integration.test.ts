import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient, type Role } from "@prisma/client";

const enabled = Boolean(process.env.DATABASE_TEST_URL);

describe.skipIf(!enabled)("PostgreSQL constraints", () => {
  let prisma: PrismaClient;
  const createdAt = new Date();

  beforeAll(() => {
    prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_TEST_URL! } } });
  });

  afterAll(async () => prisma?.$disconnect());

  async function createUser(role: Role, isActive = true) {
    const id = randomUUID();
    return prisma.user.create({
      data: {
        id,
        email: `${id}@database.test`,
        normalizedEmail: `${id}@database.test`,
        passwordHash: "database-verification-only",
        name: "Database Verification",
        role,
        isActive,
        createdAt,
        updatedAt: createdAt,
      },
    });
  }

  it("enforces the Stage 1 invariants in PostgreSQL", async () => {
    expect(await prisma.$queryRaw`SELECT 1 AS value`).toEqual([{ value: 1 }]);

    await createUser("SUPER_ADMIN");
    await expect(createUser("SUPER_ADMIN")).rejects.toThrow();

    const defaultAdmin = await createUser("ADMIN");
    const otherAdmin = await createUser("ADMIN");
    const inactiveAdmin = await createUser("ADMIN", false);
    const homeOwner = await createUser("HOME_OWNER");

    await prisma.adminProfile.create({
      data: { userId: defaultAdmin.id, isDefaultAdmin: true, createdAt, updatedAt: createdAt },
    });
    await expect(
      prisma.adminProfile.create({
        data: { userId: otherAdmin.id, isDefaultAdmin: true, createdAt, updatedAt: createdAt },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.adminProfile.create({
        data: { userId: inactiveAdmin.id, isDefaultAdmin: true, createdAt, updatedAt: createdAt },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.adminProfile.create({ data: { userId: homeOwner.id, createdAt, updatedAt: createdAt } }),
    ).rejects.toThrow();

    await prisma.adminProfile.create({ data: { userId: otherAdmin.id, createdAt, updatedAt: createdAt } });
    await expect(
      prisma.homeOwnerProfile.create({
        data: { userId: otherAdmin.id, assignedAdminId: defaultAdmin.id, createdAt, updatedAt: createdAt },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.homeOwnerProfile.create({
        data: { userId: homeOwner.id, assignedAdminId: randomUUID(), createdAt, updatedAt: createdAt },
      }),
    ).rejects.toThrow();
    await prisma.homeOwnerProfile.create({
      data: { userId: homeOwner.id, assignedAdminId: defaultAdmin.id, createdAt, updatedAt: createdAt },
    });

    await expect(prisma.user.delete({ where: { id: defaultAdmin.id } })).rejects.toThrow();
    await expect(
      prisma.user.update({ where: { id: defaultAdmin.id }, data: { isActive: false } }),
    ).rejects.toThrow();
    await expect(
      prisma.user.update({ where: { id: homeOwner.id }, data: { role: "ADMIN" } }),
    ).rejects.toThrow();

    const tokenHash = "a".repeat(64);
    await prisma.session.create({
      data: { userId: homeOwner.id, tokenHash, expiresAt: new Date(Date.now() + 60_000) },
    });
    await expect(
      prisma.session.create({
        data: { userId: homeOwner.id, tokenHash, expiresAt: new Date(Date.now() + 60_000) },
      }),
    ).rejects.toThrow();

    const transitions = await Promise.allSettled(
      [defaultAdmin.id, otherAdmin.id].map((userId) =>
        prisma.$transaction(
          async (tx) => {
            await tx.adminProfile.updateMany({
              where: { isDefaultAdmin: true },
              data: { isDefaultAdmin: false },
            });
            await tx.adminProfile.update({ where: { userId }, data: { isDefaultAdmin: true } });
          },
          { isolationLevel: "Serializable" },
        ),
      ),
    );

    expect(transitions.some(({ status }) => status === "fulfilled")).toBe(true);
    expect(await prisma.adminProfile.count({ where: { isDefaultAdmin: true } })).toBe(1);

    const member = await createUser("HOME_USER");
    await expect(prisma.adminProfile.create({ data: { userId: member.id, createdAt, updatedAt: createdAt } })).rejects.toThrow();
    await expect(prisma.homeOwnerProfile.create({ data: { userId: member.id, assignedAdminId: otherAdmin.id, createdAt, updatedAt: createdAt } })).rejects.toThrow();
    const firstHome = await prisma.home.create({ data: { name: "First Home", timezone: "Asia/Kolkata", memberships: { create: { userId: homeOwner.id, role: "OWNER" } } } });
    const secondHome = await prisma.home.create({ data: { name: "Second Home", timezone: "UTC", memberships: { create: { userId: homeOwner.id, role: "OWNER" } } } });
    await expect(prisma.homeMembership.create({ data: { homeId: firstHome.id, userId: homeOwner.id, role: "MEMBER" } })).rejects.toThrow();
    await expect(prisma.homeMembership.create({ data: { homeId: firstHome.id, userId: member.id, role: "OWNER" } })).rejects.toThrow();
    await expect(prisma.homeMembership.create({ data: { homeId: randomUUID(), userId: member.id, role: "MEMBER" } })).rejects.toThrow();
    await expect(prisma.homeMembership.create({ data: { homeId: firstHome.id, userId: randomUUID(), role: "MEMBER" } })).rejects.toThrow();
    await prisma.homeMembership.createMany({ data: [{ homeId: firstHome.id, userId: member.id, role: "MEMBER" }, { homeId: secondHome.id, userId: member.id, role: "MEMBER" }] });
    await prisma.room.create({ data: { homeId: firstHome.id, name: "Kitchen", normalizedName: "kitchen" } });
    await expect(prisma.room.create({ data: { homeId: firstHome.id, name: " KITCHEN ", normalizedName: "kitchen" } })).rejects.toThrow();
    await prisma.room.create({ data: { homeId: secondHome.id, name: "Kitchen", normalizedName: "kitchen" } });
    await expect(prisma.room.create({ data: { homeId: randomUUID(), name: "Invalid", normalizedName: "invalid" } })).rejects.toThrow();
    await prisma.home.update({ where: { id: firstHome.id }, data: { isArchived: true } });
    expect(await prisma.room.count({ where: { homeId: firstHome.id } })).toBe(1);
    expect(await prisma.homeMembership.count({ where: { homeId: firstHome.id } })).toBe(2);

    const room = await prisma.room.findFirstOrThrow({ where: { homeId: secondHome.id } });
    const device = await prisma.device.create({ data: { homeId: firstHome.id, name: "Unassigned Light", deviceType: "LIGHT", protocol: "WIFI", capabilities: ["power"], state: { power: false } } });
    expect(device.roomId).toBeNull();
    await expect(prisma.device.create({ data: { homeId: randomUUID(), name: "Invalid Home", deviceType: "LIGHT", protocol: "WIFI", capabilities: ["power"], state: {} } })).rejects.toThrow();
    await expect(prisma.device.update({ where: { id: device.id }, data: { roomId: room.id } })).rejects.toThrow();
    const sameHomeRoom = await prisma.room.create({ data: { homeId: firstHome.id, name: "Hall", normalizedName: "hall" } });
    await prisma.device.update({ where: { id: device.id }, data: { roomId: sameHomeRoom.id, isArchived: true } });
    await prisma.room.delete({ where: { id: sameHomeRoom.id } });
    const archivedDevice = await prisma.device.findUniqueOrThrow({ where: { id: device.id } });
    expect(archivedDevice.roomId).toBeNull();
    expect(archivedDevice.state).toEqual({ power: false });
    expect(archivedDevice.isArchived).toBe(true);
  });
});
