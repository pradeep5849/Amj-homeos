import { describe, expect, it } from "vitest";
import { gatewayEnrollmentSchema } from "../lib/cctv/gateway-enrollment";
import { CCTV_REQUEST_CLOCK_SKEW_MS, verifyGatewayRequest } from "../lib/cctv/gateway-request-auth";

describe("CCTV authentication input validation", () => {
  it("rejects missing or extra enrollment fields", () => {
    expect(gatewayEnrollmentSchema.safeParse({ token: "invalid", publicKey: "invalid", signature: "invalid" }).success).toBe(false);
    expect(gatewayEnrollmentSchema.safeParse({
      token: "a".repeat(43), publicKey: "a".repeat(100),
      signature: "a".repeat(86), admin: true,
    }).success).toBe(false);
  });
  it("rejects timestamps outside the allowed clock window", () => {
    const now = 1_800_000_000_000;
    const base = {
      homeId: "h", gatewayId: "g", method: "POST", path: "/heartbeat",
      timestamp: now - CCTV_REQUEST_CLOCK_SKEW_MS - 1,
      nonce: "n".repeat(24), bodyHash: "0".repeat(64),
      signature: "s".repeat(86), publicKey: "invalid", now,
    };
    expect(verifyGatewayRequest(base)).toBe(false);
    expect(verifyGatewayRequest({ ...base, timestamp: Number.NaN })).toBe(false);
  });
});
