import { describe, expect, it } from "vitest";
import { parseAllowedCurtainCommand } from "../deploy/local-hub/curtain-commands.mjs";
import { normalizeHaEntities } from "../deploy/local-hub/ha-device-discovery.mjs";
import { buildInventorySnapshot } from "../deploy/local-hub/device-inventory.mjs";
import { ruvexaScript } from "../deploy/local-hub/ruvexa-preview.mjs";

describe("curtain command safety", () => {
  const allowed = new Set(["cover.bedroom", "lock.front"]);
  it("accepts only open/close/stop for allowlisted covers", () => {
    expect(parseAllowedCurtainCommand({ entityId: "cover.bedroom", action: "open" }, allowed))
      .toEqual({ entityId: "cover.bedroom", action: "open", service: "open_cover" });
    expect(parseAllowedCurtainCommand({ entityId: "cover.bedroom", action: "stop" }, allowed)?.service)
      .toBe("stop_cover");
    for (const command of [
      { entityId: "cover.other", action: "open" },
      { entityId: "lock.front", action: "open" },
      { entityId: "cover.bedroom", action: "unlock" },
      { entityId: "cover.bedroom", action: "set_cover_position" },
      { entityId: "cover.bedroom", action: "close", position: 100 },
      null,
    ]) expect(parseAllowedCurtainCommand(command, allowed)).toBeNull();
  });
  it("exposes only supported actions and does not leak HA attributes", () => {
    const devices = normalizeHaEntities([
      { entity_id: "cover.bedroom", state: "closed",
        attributes: { supported_features: 11, secret: "private" } },
      { entity_id: "cover.unavailable", state: "unavailable",
        attributes: { supported_features: 11 } },
    ]);
    const inventory = buildInventorySnapshot(devices);
    expect(inventory.devices[0].curtainActions).toEqual({ open: true, close: true, stop: true });
    expect(inventory.devices[1].curtainActions).toBeNull();
    expect(JSON.stringify(inventory)).not.toContain("private");
  });
  it("gates UI buttons by device action support", () => {
    expect(ruvexaScript).toContain('fetch("/v1/devices/curtain"');
    expect(ruvexaScript).toContain('device.curtainActions[action] !== true');
  });
});
