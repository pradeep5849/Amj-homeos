import { describe, it, expect } from "vitest";
import {
  generateGatewayIdentity, createOwnershipChallenge,
  signOwnershipChallenge, verifyOwnershipSignature,
} from "../deploy/local-hub/ownership-proof.mjs";

describe("gateway ownership proof primitives", () => {
  it("signs and verifies a bound challenge", () => {
    const identity = generateGatewayIdentity();
    const challenge = createOwnershipChallenge({ gatewayId: "gateway_12345678", now: 1000 });
    const signature = signOwnershipChallenge(identity.privateKeyPem, challenge);
    expect(verifyOwnershipSignature(identity.publicKeyPem, challenge, signature, {
      now: 2000, expectedGatewayId: "gateway_12345678",
    })).toBe(true);
    expect(verifyOwnershipSignature(identity.publicKeyPem, challenge, signature, {
      now: 2000, expectedGatewayId: "gateway_87654321",
    })).toBe(false);
    expect(verifyOwnershipSignature(identity.publicKeyPem, challenge, signature, {
      now: challenge.expiresAt, expectedGatewayId: "gateway_12345678",
    })).toBe(false);
  });
  it("rejects tampering and unrelated gateway keys", () => {
    const identity = generateGatewayIdentity();
    const other = generateGatewayIdentity();
    const challenge = createOwnershipChallenge({ gatewayId: "gateway_12345678", now: 1000 });
    const signature = signOwnershipChallenge(identity.privateKeyPem, challenge);
    const options = { now: 2000, expectedGatewayId: "gateway_12345678" };
    expect(verifyOwnershipSignature(other.publicKeyPem, challenge, signature, options)).toBe(false);
    expect(verifyOwnershipSignature(identity.publicKeyPem, { ...challenge, nonce: "0".repeat(64) }, signature, options)).toBe(false);
    expect(verifyOwnershipSignature(identity.publicKeyPem, challenge, "invalid", options)).toBe(false);
  });
});
