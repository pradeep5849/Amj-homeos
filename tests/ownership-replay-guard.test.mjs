import { describe, it, expect } from "vitest";
import { createOwnershipReplayGuard } from "../deploy/local-hub/ownership-replay-guard.mjs";
import { createOwnershipChallenge } from "../deploy/local-hub/ownership-proof.mjs";

describe("ownership replay guard", () => {
  it("accepts once and rejects reuse", () => {
    const guard = createOwnershipReplayGuard({ now: () => 1000 });
    const challenge = createOwnershipChallenge({ gatewayId: "gateway_12345678", now: 1000 });
    expect(guard.consume(challenge)).toBe(true);
    expect(guard.consume(challenge)).toBe(false);
  });
  it("rejects expired and malformed challenges", () => {
    const guard = createOwnershipReplayGuard({ now: () => 3000 });
    const expired = createOwnershipChallenge({ gatewayId: "gateway_12345678", now: 1000, ttlMs: 1000 });
    expect(guard.consume(expired)).toBe(false);
    expect(guard.consume({ ...expired, expiresAt: 4000, nonce: "invalid" })).toBe(false);
  });
  it("enforces capacity and prunes expired entries", () => {
    let time = 1000;
    const guard = createOwnershipReplayGuard({ now: () => time, maxEntries: 1 });
    const first = createOwnershipChallenge({ gatewayId: "gateway_12345678", now: time, ttlMs: 1000 });
    const second = createOwnershipChallenge({ gatewayId: "gateway_12345678", now: time, ttlMs: 2000 });
    expect(guard.consume(first)).toBe(true);
    expect(guard.consume(second)).toBe(false);
    time = 2000;
    expect(guard.consume(second)).toBe(true);
  });
});
