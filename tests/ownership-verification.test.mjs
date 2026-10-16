import { describe, it, expect } from "vitest";
import {
  generateGatewayIdentity, createOwnershipChallenge, signOwnershipChallenge,
} from "../deploy/local-hub/ownership-proof.mjs";
import { createOwnershipVerificationPipeline } from "../deploy/local-hub/ownership-verification.mjs";

describe("ownership verification pipeline", () => {
  it("accepts a valid proof once, rejects replay", () => {
    const identity = generateGatewayIdentity();
    const challenge = createOwnershipChallenge({ gatewayId: "gateway_12345678", now: 1000 });
    const signature = signOwnershipChallenge(identity.privateKeyPem, challenge);
    const pipeline = createOwnershipVerificationPipeline({ now: () => 2000 });
    const proof = { publicKeyPem: identity.publicKeyPem, challenge, signature, expectedGatewayId: "gateway_12345678" };
    expect(pipeline.verifyAndConsume(proof)).toBe(true);
    expect(pipeline.verifyAndConsume(proof)).toBe(false);
  });
  it("does not consume a challenge on invalid signature", () => {
    const identity = generateGatewayIdentity();
    const other = generateGatewayIdentity();
    const challenge = createOwnershipChallenge({ gatewayId: "gateway_12345678", now: 1000 });
    const signature = signOwnershipChallenge(identity.privateKeyPem, challenge);
    const pipeline = createOwnershipVerificationPipeline({ now: () => 2000 });
    const proof = { publicKeyPem: other.publicKeyPem, challenge, signature, expectedGatewayId: "gateway_12345678" };
    expect(pipeline.verifyAndConsume(proof)).toBe(false);
    expect(pipeline.verifyAndConsume({ ...proof, publicKeyPem: identity.publicKeyPem })).toBe(true);
  });
  it("rejects an expired proof", () => {
    const identity = generateGatewayIdentity();
    const challenge = createOwnershipChallenge({ gatewayId: "gateway_12345678", now: 1000, ttlMs: 1000 });
    const signature = signOwnershipChallenge(identity.privateKeyPem, challenge);
    const pipeline = createOwnershipVerificationPipeline({ now: () => 2000 });
    expect(pipeline.verifyAndConsume({ publicKeyPem: identity.publicKeyPem, challenge, signature, expectedGatewayId: "gateway_12345678" })).toBe(false);
  });
});
