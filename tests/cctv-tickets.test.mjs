import { describe, expect, it } from "vitest";
import { createCctvTicketAuthority } from "../deploy/local-hub/cctv-tickets.mjs";

describe("CCTV media ticket authority", () => {
  const sessionId = "a".repeat(32);
  it("issues one-use scoped tickets without media URLs or passwords", () => {
    const authority = createCctvTicketAuthority();
    const issued = authority.issue({ entityId: "camera.front", purpose: "live", sessionId });
    expect(issued).toMatchObject({ entityId: "camera.front", purpose: "live" });
    expect(issued.token.length).toBeGreaterThan(32);
    expect(issued).not.toHaveProperty("rtspUrl");
    expect(authority.consume({ ...issued, sessionId: "b".repeat(32) })).toBe(false);
    expect(authority.consume({ ...issued, entityId: "camera.other", sessionId })).toBe(false);
    expect(authority.consume({ ...issued, purpose: "recordingPlayback", sessionId })).toBe(false);
    expect(authority.consume({ ...issued, sessionId })).toBe(true);
    expect(authority.consume({ ...issued, sessionId })).toBe(false);
  });
  it("expires tickets and rejects malformed requests", () => {
    let time = 1000;
    const authority = createCctvTicketAuthority({ now: () => time, ttlMs: 100 });
    const issued = authority.issue({ entityId: "camera.front", purpose: "live", sessionId });
    time = 1100;
    expect(authority.consume({ ...issued, sessionId })).toBe(false);
    expect(authority.count()).toBe(0);
    expect(() => authority.issue({ entityId: "lock.front", purpose: "live", sessionId })).toThrow();
    expect(() => authority.issue({ entityId: "camera.front", purpose: "ptz", sessionId })).toThrow();
    expect(() => authority.issue({ entityId: "camera.front", purpose: "live", sessionId: "bad" })).toThrow();
  });
  it("revokes all tickets belonging to one customer session", () => {
    const authority = createCctvTicketAuthority();
    const first = authority.issue({ entityId: "camera.front", purpose: "live", sessionId });
    const second = authority.issue({ entityId: "camera.back", purpose: "recordingPlayback", sessionId });
    const other = authority.issue({ entityId: "camera.front", purpose: "live", sessionId: "b".repeat(32) });
    authority.revokeSession(sessionId);
    expect(authority.consume({ ...first, sessionId })).toBe(false);
    expect(authority.consume({ ...second, sessionId })).toBe(false);
    expect(authority.consume({ ...other, sessionId: "b".repeat(32) })).toBe(true);
  });
});
