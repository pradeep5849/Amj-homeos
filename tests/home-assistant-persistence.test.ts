import { describe, expect, it, vi } from "vitest";
import { registerHomeAssistantEntity, resolveHomeAssistantCommandTarget } from "../src/lib/home-assistant/persistence";
import type { PrismaClient } from "@prisma/client";

const entity = {
  provider: "HOME_ASSISTANT" as const,
  externalId: "light.kitchen",
  name: "Kitchen",
  deviceType: "LIGHT" as const,
  capabilities: { power: { readable: true, writable: true } },
  state: { power: true },
  available: true,
  metadata: { domain: "light", entityId: "light.kitchen" },
};

function mockDb(existing: unknown = null) {
  const tx = {
    home: { findFirst: vi.fn().mockResolvedValue({ id: "home-1" }) },
    homeAssistantEntityBinding: {
      findUnique: vi.fn().mockResolvedValue(existing),
      create: vi.fn().mockResolvedValue({ id: "binding-1" }),
    },
    device: {
      create: vi.fn().mockResolvedValue({ id: "device-1" }),
      update: vi.fn().mockResolvedValue({ id: "device-1" }),
    },
  };
  const db = { ...tx, $transaction: (fn: (client: typeof tx) => unknown) => fn(tx) };
  return { db: db as unknown as PrismaClient, tx };
}

describe("Home Assistant persistence", () => {
  const input = { homeId: "home-1", instanceId: "hub-1", entity, protocol: "WIFI" as const };
  it("creates canonical device and binding atomically", async () => {
    const { db, tx } = mockDb();
    expect(await registerHomeAssistantEntity(db, input)).toEqual({ deviceId: "device-1", created: true });
    expect(tx.device.create).toHaveBeenCalledOnce();
    expect(tx.homeAssistantEntityBinding.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ homeId: "home-1", instanceId: "hub-1", entityId: "light.kitchen", deviceId: "device-1" }),
    });
  });
  it("reuses an existing device without duplication", async () => {
    const { db, tx } = mockDb({
      homeId: "home-1", deviceId: "device-1", isCommandOwner: true,
      device: { homeId: "home-1", isArchived: false },
    });
    expect(await registerHomeAssistantEntity(db, input)).toEqual({ deviceId: "device-1", created: false });
    expect(tx.device.create).not.toHaveBeenCalled();
    expect(tx.device.update).toHaveBeenCalledOnce();
  });
  it("rejects an identity bound to another home", async () => {
    const { db } = mockDb({
      homeId: "home-2", deviceId: "device-1", isCommandOwner: true,
      device: { homeId: "home-2", isArchived: false },
    });
    await expect(registerHomeAssistantEntity(db, input)).rejects.toThrow();
  });
  it("resolves command target only for matching home and hub", async () => {
    const { db } = mockDb({
      homeId: "home-1", instanceId: "hub-1", entityId: "light.kitchen",
      isCommandOwner: true, home: { isArchived: false },
      device: { homeId: "home-1", isArchived: false },
    });
    await expect(resolveHomeAssistantCommandTarget(db, {
      homeId: "home-1", instanceId: "hub-1", deviceId: "device-1",
    })).resolves.toBe("light.kitchen");
    await expect(resolveHomeAssistantCommandTarget(db, {
      homeId: "home-2", instanceId: "hub-1", deviceId: "device-1",
    })).rejects.toThrow();
  });
});
