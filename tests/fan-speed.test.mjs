import { describe, expect, it } from "vitest";
import { parseAllowedFanSpeed } from "../deploy/local-hub/fan-speed.mjs";
import { normalizeHaEntities } from "../deploy/local-hub/ha-device-discovery.mjs";
import { buildInventorySnapshot } from "../deploy/local-hub/device-inventory.mjs";
import { ruvexaScript } from "../deploy/local-hub/ruvexa-preview.mjs";

describe("fan speed permissions and metadata", () => {
  const allowlist = new Set(["fan.bedroom", "switch.hall"]);
  it("accepts bounded integer percentages only for approved fans", () => {
    expect(parseAllowedFanSpeed({ entityId: "fan.bedroom", percentage: 30 }, allowlist))
      .toEqual({ entityId: "fan.bedroom", percentage: 30 });
    for (const input of [
      { entityId: "fan.other", percentage: 30 },
      { entityId: "switch.hall", percentage: 30 },
      { entityId: "fan.bedroom", percentage: -10 },
      { entityId: "fan.bedroom", percentage: 110 },
      { entityId: "fan.bedroom", percentage: 25 },
      { entityId: "fan.bedroom", percentage: "50" },
      { entityId: "fan.bedroom", percentage: 50, extra: true },
      null,
    ]) expect(parseAllowedFanSpeed(input, allowlist)).toBeNull();
  });
  it("reports speed support and valid percentages without leaking HA attributes", () => {
    const devices = normalizeHaEntities([
      { entity_id: "fan.bedroom", state: "on", attributes: { supported_features: 1, percentage: 60, secret: "private" } },
      { entity_id: "fan.simple", state: "on", attributes: { supported_features: 0 } },
    ]);
    const inventory = buildInventorySnapshot(devices);
    expect(inventory.devices[0]).toMatchObject({ supportsFanSpeed: true, fanSpeedPercentage: 60 });
    expect(inventory.devices[1]).toMatchObject({ supportsFanSpeed: false, fanSpeedPercentage: null });
    expect(JSON.stringify(inventory)).not.toContain("private");
  });
  it("renders fan speed controls only with capability and availability", () => {
    expect(ruvexaScript).toContain('device.supportsFanSpeed === true');
    expect(ruvexaScript).toContain('fetch("/v1/devices/fan-speed"');
    expect(ruvexaScript).toContain('device.availability === "online"');
  });
});
