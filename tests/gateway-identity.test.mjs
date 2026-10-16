import { describe, it, expect } from "vitest";
import { generateGatewayIdentity } from "../deploy/local-hub/ownership-proof.mjs";
import {
  fingerprintGatewayPublicKey, verifyPinnedGatewayIdentity,
} from "../deploy/local-hub/gateway-identity.mjs";

describe("gateway identity fingerprint validation", () => {
  it("accepts only a pinned matching public key", () => {
    const identity = generateGatewayIdentity();
    const other = generateGatewayIdentity();
    const expectedFingerprint = fingerprintGatewayPublicKey(identity.publicKeyPem);
    expect(expectedFingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(verifyPinnedGatewayIdentity({ publicKeyPem: identity.publicKeyPem, expectedFingerprint })).toBe(true);
    expect(verifyPinnedGatewayIdentity({ publicKeyPem: other.publicKeyPem, expectedFingerprint })).toBe(false);
  });
  it("rejects invalid or untrusted fingerprints", () => {
    const identity = generateGatewayIdentity();
    expect(verifyPinnedGatewayIdentity({ publicKeyPem: identity.publicKeyPem, expectedFingerprint: "invalid" })).toBe(false);
    expect(verifyPinnedGatewayIdentity({ publicKeyPem: "invalid", expectedFingerprint: "sha256:" + "0".repeat(64) })).toBe(false);
  });
});
