import { describe, expect, it } from "vitest";
import { assertHomeAssistantCommandOwner, reconcileHomeAssistantDevices, type RegistryDevice } from "../src/lib/home-assistant/registry";
import type { AmjDiscoveredEntity } from "../src/lib/home-assistant/mapping";

const entity: AmjDiscoveredEntity = {
  provider: "HOME_ASSISTANT", externalId: "light.kitchen", name: "Kitchen",
  deviceType: "LIGHT", capabilities: { power: { readable: true, writable: true } },
  state: { power: true }, available: true,
  metadata: { domain: "light", entityId: "light.kitchen" },
};
const identity = { provider: "HOME_ASSISTANT", instanceId: "hub-1", externalId: "light.kitchen" };
const existing: RegistryDevice = {
  id: "amj-1", homeId: "home-1", commandOwner: identity, identities: [identity],
};
const plan = (devices: RegistryDevice[], entities = [entity]) =>
  reconcileHomeAssistantDevices({ homeId: "home-1", instanceId: "hub-1", existing: devices, discovered: entities });

describe("Home Assistant canonical registry planner", () => {
  it("plans creation only for unseen provider identities", () => {
    expect(plan([])).toMatchObject({ create: [entity], update: [], conflicts: [] });
  });
  it("matches the same entity to the existing canonical device", () => {
    expect(plan([existing])).toMatchObject({ create: [], update: [{ deviceId: "amj-1" }], conflicts: [] });
  });
  it("deduplicates repeated discovery results", () => {
    expect(plan([], [entity, entity]).create).toHaveLength(1);
  });
  it("does not claim a device owned by a different adapter", () => {
    const other: RegistryDevice = { ...existing, commandOwner: { provider: "TUYA_DIRECT", instanceId: "hub-1", externalId: "abc" } };
    expect(plan([other]).conflicts[0].reason).toBe("COMMAND_OWNED_BY_ANOTHER_ADAPTER");
    expect(() => assertHomeAssistantCommandOwner(other, "home-1", "hub-1", "light.kitchen")).toThrow();
  });
  it("rejects cross-home identity reuse", () => {
    expect(plan([{ ...existing, homeId: "home-2" }]).conflicts[0].reason).toBe("CROSS_HOME_IDENTITY");
    expect(() => assertHomeAssistantCommandOwner(existing, "home-2", "hub-1", "light.kitchen")).toThrow();
  });
  it("rejects ambiguous identities", () => {
    expect(plan([existing, { ...existing, id: "amj-2" }]).conflicts[0].reason).toBe("AMBIGUOUS_IDENTITY");
  });
});
