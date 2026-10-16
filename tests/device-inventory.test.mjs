import { describe, it, expect } from "vitest";
import { normalizeHaEntities } from "../deploy/local-hub/ha-device-discovery.mjs";
import { buildInventorySnapshot } from "../deploy/local-hub/device-inventory.mjs";

describe("RUVEXA-ready gateway inventory", () => {
  it("summarizes online, offline and category counts without raw HA attributes", () => {
    const devices = normalizeHaEntities([
      { entity_id: "light.kitchen", state: "on", attributes: { friendly_name: "Kitchen", secret: "hidden" } },
      { entity_id: "fan.bedroom", state: "unavailable", attributes: {} },
      { entity_id: "cover.curtain", state: "closed", attributes: {} },
    ]);
    const result = buildInventorySnapshot(devices, { generatedAt: "2026-10-16T00:00:00.000Z" });
    expect(result).toMatchObject({
      count: 3, readOnly: true,
      summary: { total: 3, online: 2, offline: 1, lighting: 1, fans: 1, curtains: 1 },
    });
    expect(result.devices.find(x => x.id === "light.kitchen")).toMatchObject({ name: "Kitchen", isOn: true, canToggle: true });
    expect(result.devices.find(x => x.id === "cover.curtain")).toMatchObject({ readOnly: true, canToggle: false });
    expect(JSON.stringify(result)).not.toContain("hidden");
  });
  it("rejects malformed inventory", () => {
    expect(() => buildInventorySnapshot(null)).toThrow();
    expect(() => buildInventorySnapshot([{ entityId: "bad", category: "camera", availabilityStatus: "online" }])).toThrow();
  });
});
