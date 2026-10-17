import { describe, expect, it } from "vitest";
import { parseAllowedCurtainPosition } from "../deploy/local-hub/curtain-position.mjs";
import { normalizeHaEntities } from "../deploy/local-hub/ha-device-discovery.mjs";
import { buildInventorySnapshot } from "../deploy/local-hub/device-inventory.mjs";
import { ruvexaScript } from "../deploy/local-hub/ruvexa-preview.mjs";

describe("curtain position and CCTV metadata", () => {
  const allowlist = new Set(["cover.bedroom", "camera.driveway"]);
  it("accepts only explicitly allowed covers and integer positions", () => {
    expect(parseAllowedCurtainPosition({ entityId: "cover.bedroom", position: 0 }, allowlist))
      .toEqual({ entityId: "cover.bedroom", position: 0 });
    expect(parseAllowedCurtainPosition({ entityId: "cover.bedroom", position: 100 }, allowlist)?.position).toBe(100);
    for (const command of [
      { entityId: "camera.driveway", position: 50 },
      { entityId: "cover.other", position: 50 },
      { entityId: "cover.bedroom", position: -1 },
      { entityId: "cover.bedroom", position: 101 },
      { entityId: "cover.bedroom", position: 12.5 },
      { entityId: "cover.bedroom", position: "50" },
      { entityId: "cover.bedroom", position: 50, extra: true },
      null,
    ]) expect(parseAllowedCurtainPosition(command, allowlist)).toBeNull();
  });
  it("normalizes camera metadata and curtain position without exposing secrets", () => {
    const devices = normalizeHaEntities([
      { entity_id: "camera.driveway", state: "idle", attributes: { friendly_name: "Driveway", access_token: "secret" } },
      { entity_id: "cover.bedroom", state: "open", attributes: { supported_features: 15, current_position: 73 } },
      { entity_id: "cover.simple", state: "closed", attributes: { supported_features: 3 } },
    ]);
    const inventory = buildInventorySnapshot(devices);
    expect(inventory.summary.cameras).toBe(1);
    expect(inventory.devices.find(x => x.id === "camera.driveway")).toMatchObject({ category: "cameras", readOnly: true });
    expect(inventory.devices.find(x => x.id === "cover.bedroom")).toMatchObject({ curtainPositionSupported: true, curtainPosition: 73 });
    expect(inventory.devices.find(x => x.id === "cover.simple").curtainPositionSupported).toBe(false);
    expect(JSON.stringify(inventory)).not.toContain("secret");
  });
  it("renders gated curtain slider and on-demand camera still image", () => {
    expect(ruvexaScript).toContain('fetch("/v1/devices/curtain-position"');
    expect(ruvexaScript).toContain('device.curtainPositionSupported === true');
    expect(ruvexaScript).toContain('fetch("/v1/cameras/snapshot?entityId="');
    expect(ruvexaScript).toContain('button.textContent = "View still image"');
  });
});
