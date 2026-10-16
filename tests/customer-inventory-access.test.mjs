import { describe, expect, it } from "vitest";
import { createCustomerSessionAuthority } from "../deploy/local-hub/customer-sessions.mjs";
import { normalizeHaEntities } from "../deploy/local-hub/ha-device-discovery.mjs";
import { buildInventorySnapshot } from "../deploy/local-hub/device-inventory.mjs";

describe("customer-scoped inventory", () => {
  const states = [
    { entity_id: "light.kitchen", state: "on", attributes: {} },
    { entity_id: "switch.hall", state: "off", attributes: {} },
    { entity_id: "lock.front_door", state: "locked", attributes: {} },
  ];
  it("only returns approved entities and recalculates counts", () => {
    const authority = createCustomerSessionAuthority();
    const session = authority.issue({ clientId: "ruvexa01", allowedEntities: ["light.kitchen"] });
    const approved = authority.approvedEntities(session);
    const snapshot = buildInventorySnapshot(normalizeHaEntities(states).filter(device => approved.has(device.entityId)));
    expect(snapshot.devices.map(x => x.id)).toEqual(["light.kitchen"]);
    expect(snapshot.summary.total).toBe(1);
    expect(snapshot.summary.security).toBe(0);
  });
  it("denies invalid, revoked and expired credentials", () => {
    let clock = 0;
    const authority = createCustomerSessionAuthority({ now: () => clock, ttlMs: 100 });
    const session = authority.issue({ clientId: "ruvexa01", allowedEntities: ["light.kitchen"] });
    expect(authority.approvedEntities({ ...session, token: "wrong" })).toBeNull();
    expect(authority.approvedEntities(session)).toEqual(new Set(["light.kitchen"]));
    clock = 100;
    expect(authority.approvedEntities(session)).toBeNull();
    const second = authority.issue({ clientId: "ruvexa02", allowedEntities: ["switch.hall"] });
    authority.revoke(second.sessionId);
    expect(authority.approvedEntities(second)).toBeNull();
  });
});
