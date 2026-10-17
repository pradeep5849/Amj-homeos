import { describe, expect, it } from "vitest";
import { parseAllowedFanSpeed, parseFanStageConfig } from "../deploy/local-hub/fan-speed.mjs";
import { normalizeHaEntities } from "../deploy/local-hub/ha-device-discovery.mjs";
import { buildInventorySnapshot } from "../deploy/local-hub/device-inventory.mjs";
import { ruvexaScript } from "../deploy/local-hub/ruvexa-preview.mjs";

describe("fan stage permissions and metadata", () => {
  const allowlist = new Set(["fan.bedroom", "fan.hall", "fan.office", "switch.hall"]);
  const stages = parseFanStageConfig("fan.bedroom:5,fan.hall:4,fan.office:percentage");
  it("accepts only configured 4 or 5 stage fans and maps to HA percentage", () => {
    expect(parseAllowedFanSpeed({ entityId: "fan.bedroom", stage: 3 }, allowlist, stages))
      .toEqual({ entityId: "fan.bedroom", stage: 3, percentage: 60 });
    expect(parseAllowedFanSpeed({ entityId: "fan.hall", stage: 1 }, allowlist, stages)?.percentage).toBe(25);
    expect(parseAllowedFanSpeed({ entityId: "fan.office", percentage: 47 }, allowlist, stages))
      .toEqual({ entityId: "fan.office", percentage: 47 });
    expect(parseAllowedFanSpeed({ entityId: "fan.office", stage: 3 }, allowlist, stages)).toBeNull();
    expect(parseAllowedFanSpeed({ entityId: "fan.bedroom", percentage: 60 }, allowlist, stages)).toBeNull();
    for (const input of [
      { entityId: "fan.other", stage: 3 },
      { entityId: "switch.hall", stage: 3 },
      { entityId: "fan.bedroom", stage: 0 },
      { entityId: "fan.hall", stage: 5 },
      { entityId: "fan.bedroom", stage: 2.5 },
      { entityId: "fan.bedroom", stage: "3" },
      { entityId: "fan.bedroom", stage: 3, extra: true },
      { entityId: "fan.office", percentage: 101 },
      { entityId: "fan.office", percentage: 12.5 },
      null,
    ]) expect(parseAllowedFanSpeed(input, allowlist, stages)).toBeNull();
    expect(() => parseFanStageConfig("fan.bad:6")).toThrow();
  });
  it("reports stage count and stage number without leaking HA attributes", () => {
    const devices = normalizeHaEntities([
      { entity_id: "fan.bedroom", state: "on", attributes: { supported_features: 1, percentage: 60, secret: "private" } },
      { entity_id: "fan.simple", state: "on", attributes: { supported_features: 0 } },
    ], { fanStages: stages });
    const inventory = buildInventorySnapshot(devices);
    expect(inventory.devices[0]).toMatchObject({ supportsFanSpeed: true, fanSpeedStages: 5, fanSpeedStage: 3 });
    expect(inventory.devices[1]).toMatchObject({ supportsFanSpeed: false, fanSpeedStages: null });
    expect(JSON.stringify(inventory)).not.toContain("private");
  });
  it("renders stage selector only when configured and available", () => {
    expect(ruvexaScript).toContain('device.supportsFanSpeed === true');
    expect(ruvexaScript).toContain('fetch("/v1/devices/fan-speed"');
    expect(ruvexaScript).toContain('device.fanSpeedStages === 4 || device.fanSpeedStages === 5');
    expect(ruvexaScript).toContain('"Speed " + String(stage)');
    expect(ruvexaScript).toContain('device.fanSpeedMode === "percentage"');
  });
});
