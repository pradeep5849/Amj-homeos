import type { PrismaClient } from "@prisma/client";
import type { AmjDiscoveredEntity } from "./mapping";

/** Hub-side only. Caller must authorize installation and verify the actual radio protocol. */
export async function registerHomeAssistantEntity(
  db: PrismaClient,
  input: {
    homeId: string;
    instanceId: string;
    entity: AmjDiscoveredEntity;
    protocol: "WIFI" | "ZIGBEE" | "TUYA";
  },
): Promise<{ deviceId: string; created: boolean }> {
  const { homeId, instanceId, entity, protocol } = input;
  if (!homeId || !instanceId || entity.provider !== "HOME_ASSISTANT" ||
      !/^[a-z][a-z0-9_]*\.[a-z0-9_]+$/.test(entity.externalId) ||
      entity.metadata.entityId !== entity.externalId) {
    throw new Error("Invalid Home Assistant identity");
  }
  return db.$transaction(async (tx) => {
    const home = await tx.home.findFirst({ where: { id: homeId, isArchived: false } });
    if (!home) throw new Error("Home not available");

    const existing = await tx.homeAssistantEntityBinding.findUnique({
      where: { instanceId_entityId: { instanceId, entityId: entity.externalId } },
      include: { device: true },
    });
    if (existing) {
      if (existing.homeId !== homeId || existing.device.homeId !== homeId ||
          existing.device.isArchived || !existing.isCommandOwner) {
        throw new Error("Binding not eligible for update");
      }
      await tx.device.update({
        where: { id: existing.deviceId },
        data: {
          isOnline: entity.available,
          lastSeenAt: entity.available ? new Date() : undefined,
          state: entity.state,
          capabilities: entity.capabilities,
        },
      });
      return { deviceId: existing.deviceId, created: false };
    }

    const device = await tx.device.create({
      data: {
        homeId,
        name: entity.name,
        deviceType: entity.deviceType,
        protocol,
        capabilities: entity.capabilities,
        state: entity.state,
        isOnline: entity.available,
        lastSeenAt: entity.available ? new Date() : null,
      },
    });
    await tx.homeAssistantEntityBinding.create({
      data: {
        homeId,
        instanceId,
        entityId: entity.externalId,
        deviceId: device.id,
        isCommandOwner: true,
      },
    });
    return { deviceId: device.id, created: true };
  });
}

/** Lookup enforces home, hub, device, archive and command-ownership boundaries. */
export async function resolveHomeAssistantCommandTarget(
  db: PrismaClient,
  input: { homeId: string; instanceId: string; deviceId: string },
): Promise<string> {
  const binding = await db.homeAssistantEntityBinding.findUnique({
    where: { deviceId: input.deviceId },
    include: { device: true, home: true },
  });
  if (!binding || binding.homeId !== input.homeId || binding.instanceId !== input.instanceId ||
      !binding.isCommandOwner || binding.home.isArchived || binding.device.isArchived ||
      binding.device.homeId !== input.homeId) {
    throw new Error("Home Assistant command target unavailable");
  }
  return binding.entityId;
}
