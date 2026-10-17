import { describe, expect, it } from "vitest";
import { createHash, generateKeyPairSync, randomBytes, sign } from "node:crypto";
import { createPairingToken, digestPairingToken, pairingTokenMatches } from "../lib/cctv/pairing-token";
import { enrollmentMessage, verifyEnrollmentSignature, gatewayPublicKeyFingerprint } from "../lib/cctv/gateway-enrollment";
import { gatewayRequestMessage, verifyGatewayRequest } from "../lib/cctv/gateway-request-auth";

const homeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const gatewayId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const keys = generateKeyPairSync("ed25519");
const publicKey = keys.publicKey.export({ type: "spki", format: "pem" }).toString();
const key = randomBytes(32);

describe("CCTV gateway cryptographic boundaries", () => {
  it("creates unpredictable 256-bit pairing tokens and stores only keyed digests", () => {
    const token = createPairingToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(digestPairingToken(token, key)).toMatch(/^[0-9a-f]{64}$/);
    expect(pairingTokenMatches(token, digestPairingToken(token, key), key)).toBe(true);
    expect(pairingTokenMatches(createPairingToken(), digestPairingToken(token, key), key)).toBe(false);
    expect(() => digestPairingToken(token, Buffer.alloc(8))).toThrow();
  });
  it("verifies enrollment proof only for the bound home and gateway", () => {
    const token = createPairingToken();
    const signature = sign(null, enrollmentMessage(homeId, gatewayId, token), keys.privateKey).toString("base64url");
    expect(verifyEnrollmentSignature(homeId, gatewayId, token, publicKey, signature)).toBe(true);
    expect(verifyEnrollmentSignature(homeId, "other", token, publicKey, signature)).toBe(false);
    expect(verifyEnrollmentSignature(homeId, gatewayId, createPairingToken(), publicKey, signature)).toBe(false);
    expect(gatewayPublicKeyFingerprint(publicKey)).toMatch(/^[0-9a-f]{64}$/);
  });
  it("rejects stale, modified, or invalid signed gateway requests", () => {
    const timestamp = Date.now();
    const nonce = randomBytes(24).toString("base64url");
    const path = "/api/v1/homes/" + homeId + "/cctv-gateways/" + gatewayId + "/heartbeat";
    const bodyHash = createHash("sha256").update("").digest("hex");
    const signature = sign(null, gatewayRequestMessage(homeId, gatewayId, "POST", path, timestamp, nonce, bodyHash), keys.privateKey).toString("base64url");
    const request = { homeId, gatewayId, method: "POST", path, timestamp, nonce, bodyHash, signature, publicKey, now: timestamp };
    expect(verifyGatewayRequest(request)).toBe(true);
    expect(verifyGatewayRequest({ ...request, path: "/different" })).toBe(false);
    expect(verifyGatewayRequest({ ...request, timestamp: timestamp - 300000 })).toBe(false);
    expect(verifyGatewayRequest({ ...request, signature: "invalid" })).toBe(false);
  });
});
