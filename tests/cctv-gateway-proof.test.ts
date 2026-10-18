import { describe, expect, it } from "vitest";
import { generateKeyPairSync, randomBytes, sign } from "node:crypto";
import { gatewayProofMessage, verifyGatewayProof } from "../lib/cctv/gateway-proof";
const homeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const gatewayId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
describe("CCTV gateway proof of possession", () => {
  it("accepts only a valid Ed25519 signature bound to gateway, home and challenge", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const challenge = randomBytes(32).toString("base64url");
    const signature = sign(null, gatewayProofMessage({ homeId, gatewayId, challenge }), privateKey).toString("base64url");
    const input = { homeId, gatewayId, challenge, signature, publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString() };
    expect(verifyGatewayProof(input)).toBe(true);
    expect(verifyGatewayProof({ ...input, homeId: gatewayId })).toBe(false);
    expect(verifyGatewayProof({ ...input, gatewayId: homeId })).toBe(false);
    expect(verifyGatewayProof({ ...input, challenge: randomBytes(32).toString("base64url") })).toBe(false);
    expect(verifyGatewayProof({ ...input, signature: "bad" })).toBe(false);
    const other = generateKeyPairSync("ed25519");
    expect(verifyGatewayProof({ ...input, publicKeyPem: other.publicKey.export({ type: "spki", format: "pem" }).toString() })).toBe(false);
  });
  it("rejects non-Ed25519 public keys", () => {
    const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 });
    expect(verifyGatewayProof({
      homeId, gatewayId, challenge: randomBytes(32).toString("base64url"),
      signature: randomBytes(64).toString("base64url"),
      publicKeyPem: rsa.publicKey.export({ type: "spki", format: "pem" }).toString(),
    })).toBe(false);
  });
});
