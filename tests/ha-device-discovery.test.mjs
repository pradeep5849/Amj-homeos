import { describe, it, expect } from "vitest";
import { normalizeHaEntities } from "../deploy/local-hub/ha-device-discovery.mjs";

describe("Home Assistant discovery normalization", () => {
  it("maps supported entities and filters sensitive unsupported domains", () => {
    const entities = normalizeHaEntities([
      { entity_id: "light.kitchen", state: "on", attributes: { friendly_name: "Kitchen Light" } },
      { entity_id: "cover.living_curtain", state: "closed", attributes: {} },
      { entity_id: "lock.front_door", state: "locked", attributes: {} },
      { entity_id: "camera.front", state: "idle", attributes: {} },
      { entity_id: "person.owner", state: "home", attributes: {} },
    ]);
    expect(entities.map(x => x.entityId)).toEqual([
      "cover.living_curtain", "light.kitchen", "lock.front_door",
    ]);
    expect(entities[1].name).toBe("Kitchen Light");
  });
  it("deduplicates, skips malformed records and identifies unavailable devices", () => {
    const entities = normalizeHaEntities([
      { entity_id: "switch.plug", state: "unavailable", attributes: {} },
      { entity_id: "switch.plug", state: "on", attributes: {} },
      { entity_id: "light.bad", state: "on", attributes: null },
      null,
    ]);
    expect(entities).toHaveLength(1);
    expect(entities[0].available).toBe(false);
  });
  it("rejects invalid or oversized input", () => {
    expect(() => normalizeHaEntities({})).toThrow();
    expect(() => normalizeHaEntities(Array(10001).fill(null))).toThrow();
  });
});
