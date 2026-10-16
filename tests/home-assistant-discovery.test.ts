import { describe, expect, it, vi } from "vitest";
import { previewHomeAssistantDevices, assertInstallerApprovedDevice } from "../src/lib/home-assistant/discovery";
import type { HomeAssistantClient } from "../src/lib/home-assistant/client";

const state = {
  entity_id: "switch.bedroom",
  state: "on",
  attributes: { friendly_name: "Bedroom touch switch" },
};
describe("AMJ Universal Hub Zigbee-ready discovery", () => {
  it("previews supported HA entities without changing devices", async () => {
    const client = { listStates: vi.fn().mockResolvedValue([state, {
      entity_id: "sun.sun", state: "above_horizon", attributes: {},
    }]) };
    const preview = await previewHomeAssistantDevices(client as unknown as HomeAssistantClient);
    expect(preview.supported).toMatchObject([{ externalId: "switch.bedroom", deviceType: "SWITCH" }]);
    expect(preview.skippedCount).toBe(1);
    expect(client.listStates).toHaveBeenCalledOnce();
  });
  it("requires installer approval for the exact entity", async () => {
    const client = { listStates: vi.fn().mockResolvedValue([state]) };
    const preview = await previewHomeAssistantDevices(client as unknown as HomeAssistantClient);
    const entity = preview.supported[0];
    expect(() => assertInstallerApprovedDevice({
      entity, approvedEntityId: "switch.other", verifiedProtocol: "ZIGBEE", installerApproved: true,
    })).toThrow("Explicit installer approval");
    expect(() => assertInstallerApprovedDevice({
      entity, approvedEntityId: entity.externalId, verifiedProtocol: "ZIGBEE", installerApproved: true,
    })).not.toThrow();
  });
});
