import { describe, expect, it } from "vitest";
import { gatewayChallengeDigest, gatewayChallengeUsable, newGatewayChallenge } from "../lib/cctv/gateway-challenge";

describe("CCTV gateway challenge", () => {
  it("generates random 256-bit URL-safe challenges and domain-separated digests", () => {
    const a = newGatewayChallenge(), b = newGatewayChallenge();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
    expect(gatewayChallengeDigest(a)).toMatch(/^[a-f0-9]{64}$/);
    expect(gatewayChallengeDigest(a)).not.toBe(gatewayChallengeDigest(b));
    expect(() => gatewayChallengeDigest("invalid")).toThrow();
  });
  it("expires and rejects consumed challenges", () => {
    const now = new Date("2026-10-18T17:00:00Z");
    const valid = { now, expiresAt: new Date(now.getTime() + 60_000), consumedAt: null };
    expect(gatewayChallengeUsable(valid)).toBe(true);
    expect(gatewayChallengeUsable({ ...valid, consumedAt: now })).toBe(false);
    expect(gatewayChallengeUsable({ ...valid, expiresAt: now })).toBe(false);
  });
});
