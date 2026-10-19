import { describe, expect, it } from "vitest";
import { generateKeyPairSync, randomBytes, sign } from "node:crypto";
import { gatewayPairingMessage, verifyGatewayPairingProof } from "../lib/cctv/gateway-pairing-proof";

const homeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
describe("CCTV pairing key proof", () => {
  it("binds home, code and public key to an Ed25519 signature", () => {
    const pair = generateKeyPairSync("ed25519");
    const code = randomBytes(32).toString("base64url");
    const publicKeyPem = pair.publicKey.export({ type: "spki", format: "pem" }).toString();
    const signature = sign(null, gatewayPairingMessage({ homeId, code, publicKeyPem }), pair.privateKey).toString("base64url");
    const input = { homeId, code, publicKeyPem, signature };
    expect(verifyGatewayPairingProof(input)).toBe(true);
    expect(verifyGatewayPairingProof({ ...input, homeId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" })).toBe(false);
    expect(verifyGatewayPairingProof({ ...input, code: randomBytes(32).toString("base64url") })).toBe(false);
    const other = generateKeyPairSync("ed25519");
    expect(verifyGatewayPairingProof({ ...input, publicKeyPem: other.publicKey.export({ type: "spki", format: "pem" }).toString() })).toBe(false);
    expect(verifyGatewayPairingProof({ ...input, signature: "invalid" })).toBe(false);
  });
});
