import { describe, expect, it, vi } from "vitest";
import { dispatchHomeAssistantCommand } from "../src/lib/home-assistant/dispatch";
import type { PrismaClient } from "@prisma/client";
import type { HomeAssistantClient } from "../src/lib/home-assistant/client";

const binding = {
  homeId: "home-1", instanceId: "hub-1", entityId: "light.kitchen",
  isCommandOwner: true, home: { isArchived: false },
  device: { homeId: "home-1", isArchived: false },
};
const input = {
  homeId: "home-1", instanceId: "hub-1", deviceId: "device-1",
  command: "setBrightness" as const, value: 40,
};
function setup(found: unknown = binding) {
  const db = {
    homeAssistantEntityBinding: { findUnique: vi.fn().mockResolvedValue(found) },
  } as unknown as PrismaClient;
  const client = {
    callService: vi.fn().mockResolvedValue([]),
    getState: vi.fn().mockResolvedValue({ entity_id: "light.kitchen", state: "on", attributes: {} }),
  };
  return { db, client };
}

describe("Home Assistant command dispatcher", () => {
  it("routes canonical command to correct HA service", async () => {
    const { db, client } = setup();
    const result = await dispatchHomeAssistantCommand(db, client as unknown as HomeAssistantClient, input);
    expect(client.callService).toHaveBeenCalledWith("light", "turn_on", "light.kitchen", { brightness_pct: 40 });
    expect(result).toEqual({ accepted: true, entityId: "light.kitchen", reportedState: "on" });
  });
  it("blocks cross-home requests before invoking HA", async () => {
    const { db, client } = setup();
    await expect(dispatchHomeAssistantCommand(db, client as unknown as HomeAssistantClient, {
      ...input, homeId: "home-2",
    })).rejects.toThrow("Home Assistant command target unavailable");
    expect(client.callService).not.toHaveBeenCalled();
  });
  it("does not treat HA HTTP failure as success", async () => {
    const { db, client } = setup();
    client.callService.mockRejectedValue(new Error("HA unavailable"));
    await expect(dispatchHomeAssistantCommand(db, client as unknown as HomeAssistantClient, input))
      .rejects.toThrow("HA unavailable");
  });
  it("reports accepted but unknown readback when state query fails", async () => {
    const { db, client } = setup();
    client.getState.mockRejectedValue(new Error("Offline"));
    await expect(dispatchHomeAssistantCommand(db, client as unknown as HomeAssistantClient, input))
      .resolves.toMatchObject({ accepted: true, reportedState: null });
  });
});
