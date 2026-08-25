import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient, type Role } from "@prisma/client";
import { completeAdoption } from "@/lib/onboarding";
import { claimDueJobs } from "@/lib/scheduler";

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
    const gateway = await prisma.gateway.create({ data: { homeId: firstHome.id, name: "Zigbee Gateway", gatewayType: "ZIGBEE", connectionType: "ETHERNET", isArchived: true } });
    expect((await prisma.gateway.findUniqueOrThrow({ where: { id: gateway.id } })).isArchived).toBe(true);
    await expect(prisma.gateway.create({ data: { homeId: randomUUID(), name: "Invalid", gatewayType: "ZIGBEE", connectionType: "WIFI" } })).rejects.toThrow();
    const onboarding = await prisma.deviceOnboardingSession.create({ data: { homeId: firstHome.id, initiatedByUserId: homeOwner.id, onboardingType: "WIFI_BLE", protocol: "WIFI", expiresAt: new Date(Date.now() - 1_000) } });
    expect(onboarding.expiresAt.getTime()).toBeLessThan(Date.now());
    await prisma.deviceOnboardingSession.update({ where: { id: onboarding.id }, data: { status: "CANCELLED" } });
    await expect(prisma.deviceOnboardingSession.update({ where: { id: onboarding.id }, data: { status: "PROVISIONING" } })).rejects.toThrow();
    await prisma.deviceIntegrationIdentity.create({ data: { deviceId: device.id, provider: "WEB_BLUETOOTH", externalId: "test-only-device" } });
    await expect(prisma.deviceIntegrationIdentity.create({ data: { deviceId: device.id, provider: "WEB_BLUETOOTH", externalId: "test-only-device" } })).rejects.toThrow();
    const columns = await prisma.$queryRaw<{ column_name: string }[]>`SELECT column_name FROM information_schema.columns WHERE table_name = 'DeviceOnboardingSession'`;
    expect(columns.map((column) => column.column_name)).not.toContain("wifiPassword");

    const adoptionSession = await prisma.deviceOnboardingSession.create({ data: { homeId: secondHome.id, initiatedByUserId: homeOwner.id, onboardingType: "TUYA", protocol: "TUYA", provider: "TUYA", status: "PROVISIONING", expiresAt: new Date(Date.now() + 60_000) } });
    const adopted = { externalId: `tuya-${randomUUID()}`, name: "Adopted Switch", protocol: "TUYA" as const, deviceType: "SWITCH" as const, capabilities: ["power"], state: { power: false } };
    const completion = await completeAdoption({ id: homeOwner.id, role: "HOME_OWNER" }, adoptionSession.id, { status: "SUCCESS", value: adopted }, "TUYA");
    if (!("device" in completion)) throw new Error("Expected successful canonical adoption");
    expect(completion.session.status).toBe("SUCCESS");
    expect(completion.device.homeId).toBe(secondHome.id);
    expect(await prisma.deviceIntegrationIdentity.count({ where: { deviceId: completion.device.id, provider: "TUYA", externalId: adopted.externalId } })).toBe(1);
    const duplicateSession = await prisma.deviceOnboardingSession.create({ data: { homeId: secondHome.id, initiatedByUserId: homeOwner.id, onboardingType: "TUYA", protocol: "TUYA", status: "PROVISIONING", expiresAt: new Date(Date.now() + 60_000) } });
    await expect(completeAdoption({ id: homeOwner.id, role: "HOME_OWNER" }, duplicateSession.id, { status: "SUCCESS", value: adopted }, "TUYA")).rejects.toThrow("already registered");
    expect(await prisma.device.count({ where: { externalDeviceId: adopted.externalId } })).toBe(1);

    for (const candidate of [
      { onboardingType: "WIFI_BLE" as const, protocol: "WIFI" as const, provider: "WEB_BLUETOOTH" as const },
      { onboardingType: "ZIGBEE_GATEWAY" as const, protocol: "ZIGBEE" as const, provider: "GATEWAY" as const },
    ]) {
      const providerSession = await prisma.deviceOnboardingSession.create({ data: { homeId: secondHome.id, roomId: room.id, initiatedByUserId: homeOwner.id, onboardingType: candidate.onboardingType, protocol: candidate.protocol, status: "PROVISIONING", expiresAt: new Date(Date.now() + 60_000) } });
      const providerDevice = { externalId: `${candidate.protocol.toLowerCase()}-${randomUUID()}`, name: `${candidate.protocol} Switch`, protocol: candidate.protocol, deviceType: "SWITCH" as const, capabilities: ["power"], state: { power: false } };
      const providerCompletion = await completeAdoption({ id: homeOwner.id, role: "HOME_OWNER" }, providerSession.id, { status: "SUCCESS", value: providerDevice }, candidate.provider, { roomId: room.id });
      if (!("device" in providerCompletion)) throw new Error("Expected test provider adoption");
      expect(providerCompletion.session.status).toBe("SUCCESS"); expect(providerCompletion.device.roomId).toBe(room.id);
    }

    const stage5Scene = await prisma.scene.create({ data: { homeId: secondHome.id, name: "Good Night", normalizedName: "good night", createdByUserId: homeOwner.id } });
    const stage5Automation = await prisma.automation.create({ data: { homeId: secondHome.id, name: "Door Light", normalizedName: "door light", createdByUserId: homeOwner.id } });
    const stage5Device = await prisma.device.create({ data: { homeId: secondHome.id, name: "Stage 5 Switch", deviceType: "SWITCH", protocol: "WIFI", capabilities: ["power"], state: { power: false } } });
    await prisma.sceneAction.create({ data: { sceneId: stage5Scene.id, deviceId: stage5Device.id, command: "setPower", value: true, sortOrder: 0 } });
    await expect(prisma.sceneAction.create({ data: { sceneId: stage5Scene.id, deviceId: device.id, command: "setPower", value: true, sortOrder: 1 } })).rejects.toThrow();
    await prisma.automationTrigger.create({ data: { automationId: stage5Automation.id, triggerType: "DEVICE_STATE", deviceId: stage5Device.id, capability: "power", operator: "EQUALS", value: true } });
    await prisma.automationAction.create({ data: { automationId: stage5Automation.id, deviceId: stage5Device.id, command: "setPower", value: false, sortOrder: 0 } });
    await expect(prisma.automationAction.create({ data: { automationId: stage5Automation.id, deviceId: device.id, command: "setPower", value: true, sortOrder: 1 } })).rejects.toThrow();
    await expect(prisma.automationTrigger.create({ data: { automationId: stage5Automation.id, triggerType: "DEVICE_STATE", deviceId: device.id, capability: "power", operator: "EQUALS", value: true } })).rejects.toThrow();
    await expect(prisma.scene.create({ data: { homeId: randomUUID(), name: "Invalid", normalizedName: "invalid", createdByUserId: homeOwner.id } })).rejects.toThrow();

    const schedule = await prisma.automationSchedule.create({ data: { automationId: stage5Automation.id, scheduleType: "ONCE", runAt: new Date(Date.now()+60_000), timezoneSnapshot: "UTC", nextRunAt: new Date(Date.now()+60_000) } });
    expect(schedule.automationId).toBe(stage5Automation.id);
    const dueTimer = await prisma.timer.create({ data: { homeId: secondHome.id, createdByUserId: homeOwner.id, targetType: "DEVICE_COMMAND", deviceId: stage5Device.id, command: "setPower", value: true, runAt: new Date(Date.now()-1000) } });
    await expect(prisma.timer.create({ data: { homeId: secondHome.id, createdByUserId: homeOwner.id, targetType: "DEVICE_COMMAND", deviceId: device.id, command: "setPower", value: true, runAt: new Date() } })).rejects.toThrow();
    const [claimA,claimB]=await Promise.all([claimDueJobs(),claimDueJobs()]);expect([...claimA.timerIds,...claimB.timerIds].filter(id=>id===dueTimer.id)).toHaveLength(1);
    await prisma.notification.create({ data: { userId: homeOwner.id, homeId: secondHome.id, type: "SCHEDULE", title: "Test", body: "Safe" } });
    await expect(prisma.notification.create({ data: { userId: randomUUID(), type: "SYSTEM", title: "Invalid", body: "Invalid" } })).rejects.toThrow();
    const scheduleIndexes=await prisma.$queryRaw<{indexname:string}[]>`SELECT indexname FROM pg_indexes WHERE tablename='AutomationSchedule'`;expect(scheduleIndexes.some(i=>i.indexname.includes('nextRunAt'))).toBe(true);

    const invalidTransition = await prisma.deviceOnboardingSession.create({ data: { homeId: secondHome.id, initiatedByUserId: homeOwner.id, onboardingType: "TUYA", protocol: "TUYA", status: "FAILED", expiresAt: new Date(Date.now() + 60_000) } });
    await expect(prisma.deviceOnboardingSession.update({ where: { id: invalidTransition.id }, data: { status: "SUCCESS" } })).rejects.toThrow();
  });
});
