import { describe, expect, it } from "vitest";
import { createLocalPairingAuthority } from "../deploy/local-hub/pairing.mjs";

describe("AMJ local hub pairing sessions", () => {
  it("issues unpredictable sessions that validate only their own token", () => {
    const authority = createLocalPairingAuthority();
    const a = authority.issue();
    const b = authority.issue();
    expect(a.token).not.toBe(b.token);
    expect(authority.verify(a.sessionId, a.token)).toBe(true);
    expect(authority.verify(a.sessionId, b.token)).toBe(false);
    expect(authority.verify("missing", a.token)).toBe(false);
  });
  it("expires sessions and supports revocation", () => {
    let clock = 100;
    const authority = createLocalPairingAuthority({ ttlMs: 50, now: () => clock });
    const a = authority.issue();
    clock = 151;
    expect(authority.verify(a.sessionId, a.token)).toBe(false);
    const b = authority.issue();
    expect(authority.revoke(b.sessionId)).toBe(true);
    expect(authority.verify(b.sessionId, b.token)).toBe(false);
  });
  it("limits simultaneous sessions", () => {
    const authority = createLocalPairingAuthority({ maxSessions: 1 });
    authority.issue();
    expect(() => authority.issue()).toThrow("Pairing capacity reached");
  });
});
