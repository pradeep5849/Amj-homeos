import { describe, expect, it } from "vitest";
import { createCustomerSessionAuthority } from "../deploy/local-hub/customer-sessions.mjs";

describe("local customer device grants", () => {
  it("restricts client tokens to explicitly granted entities", () => {
    const authority = createCustomerSessionAuthority();
    const session = authority.issue({ clientId: "phone_1234", allowedEntities: ["switch.kitchen"] });
    expect(authority.verify({ sessionId: session.sessionId, token: session.token, entityId: "switch.kitchen" })).toBe(true);
    expect(authority.verify({ sessionId: session.sessionId, token: session.token, entityId: "switch.bedroom" })).toBe(false);
    expect(authority.verify({ sessionId: session.sessionId, token: "wrong", entityId: "switch.kitchen" })).toBe(false);
    expect(authority.revoke(session.sessionId)).toBe(true);
    expect(authority.verify({ sessionId: session.sessionId, token: session.token })).toBe(false);
  });
  it("expires tokens and rejects invalid client IDs", () => {
    let clock = 100;
    const authority = createCustomerSessionAuthority({ now: () => clock, ttlMs: 10 });
    expect(() => authority.issue({ clientId: "x", allowedEntities: ["switch.kitchen"] })).toThrow();
    const session = authority.issue({ clientId: "phone_1234", allowedEntities: ["switch.kitchen"] });
    clock = 111;
    expect(authority.verify({ sessionId: session.sessionId, token: session.token })).toBe(false);
  });
});
