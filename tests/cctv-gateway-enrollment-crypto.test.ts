import { describe, expect, it } from "vitest";
import { gatewayEnrollmentCodeUsable, hashGatewayEnrollmentCode, newGatewayEnrollmentCode, verifyGatewayEnrollmentCode } from "../lib/cctv/gateway-enrollment-crypto";

const pepper = "a-test-only-pepper-with-at-least-32-characters";
describe("CCTV gateway enrollment cryptography", () => {
  it("creates unpredictable URL-safe 256-bit enrollment codes", () => {
    const a = newGatewayEnrollmentCode(), b = newGatewayEnrollmentCode();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(b).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });
  it("hashes and verifies codes without exposing the raw code", () => {
    const code = newGatewayEnrollmentCode(), hash = hashGatewayEnrollmentCode(code, pepper);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(code);
    expect(verifyGatewayEnrollmentCode(code, hash, pepper)).toBe(true);
    expect(verifyGatewayEnrollmentCode(newGatewayEnrollmentCode(), hash, pepper)).toBe(false);
    expect(verifyGatewayEnrollmentCode(code, "not-a-hash", pepper)).toBe(false);
    expect(verifyGatewayEnrollmentCode(code, hash, "different-pepper-with-at-least-32-chars")).toBe(false);
  });
  it("rejects weak peppers and malformed codes", () => {
    expect(() => hashGatewayEnrollmentCode(newGatewayEnrollmentCode(), "weak")).toThrow();
    expect(verifyGatewayEnrollmentCode("bad", "a".repeat(64), pepper)).toBe(false);
  });
  it("rejects consumed, revoked and expired enrollment codes", () => {
    const now = new Date("2026-10-18T10:00:00Z");
    const valid = { now, expiresAt: new Date("2026-10-18T10:05:00Z"), consumedAt: null, revokedAt: null };
    expect(gatewayEnrollmentCodeUsable(valid)).toBe(true);
    expect(gatewayEnrollmentCodeUsable({ ...valid, consumedAt: now })).toBe(false);
    expect(gatewayEnrollmentCodeUsable({ ...valid, revokedAt: now })).toBe(false);
    expect(gatewayEnrollmentCodeUsable({ ...valid, expiresAt: now })).toBe(false);
  });
});
