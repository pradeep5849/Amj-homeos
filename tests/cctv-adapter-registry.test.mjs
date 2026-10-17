import { describe, expect, it } from "vitest";
import { CCTV_BRANDS, CCTV_OPERATIONS, createCctvAdapterRegistry, validateCctvAdapter } from "../deploy/local-hub/cctv-adapter-registry.mjs";
const makeAdapter = brand => ({
  brand, model: "Demo-123", firmware: "1.0",
  capabilities: Object.fromEntries(CCTV_OPERATIONS.map(operation => [operation, false])),
});
describe("CCTV adapter contract", () => {
  it("accepts explicit disabled-by-default adapters for all three brands", () => {
    const registry = createCctvAdapterRegistry();
    CCTV_BRANDS.forEach((brand, index) => {
      const id = `camera.test_${index}`;
      const adapter = makeAdapter(brand);
      expect(validateCctvAdapter(adapter)).toBe(true);
      registry.register(id, adapter);
      expect(registry.getPublicProfile(id)).toMatchObject({ entityId: id, brand, model: "Demo-123" });
      expect(registry.capability(id, "live")).toBe(false);
      expect(registry.capability(id, "recordingPlayback")).toBe(false);
    });
    expect(registry.getPublicProfile("camera.private")).toBeNull();
  });
  it("rejects unimplemented capabilities and unsafe adapter definitions", () => {
    const invalid = makeAdapter("hikvision");
    invalid.capabilities.live = true;
    expect(validateCctvAdapter(invalid)).toBe(false);
    invalid.live = async () => {};
    expect(validateCctvAdapter(invalid)).toBe(true);
    const registry = createCctvAdapterRegistry();
    registry.register("camera.front", invalid);
    expect(registry.capability("camera.front", "live")).toBe(true);
    expect(() => registry.register("camera.front", invalid)).toThrow();
    expect(() => registry.register("lock.front", invalid)).toThrow();
    expect(validateCctvAdapter(makeAdapter("unknown"))).toBe(false);
    expect(validateCctvAdapter({ ...makeAdapter("dahua"), password: "secret" })).toBe(true);
  });
  it("does not expose adapter implementation methods in public profiles", () => {
    const adapter = makeAdapter("dahua");
    adapter.capabilities.snapshot = true;
    adapter.snapshot = async () => Buffer.from("image");
    const registry = createCctvAdapterRegistry();
    registry.register("camera.front", adapter);
    const profile = registry.getPublicProfile("camera.front");
    expect(profile).not.toHaveProperty("snapshot");
    expect(profile).not.toHaveProperty("password");
    expect(profile.capabilities.snapshot).toBe(true);
  });
});
