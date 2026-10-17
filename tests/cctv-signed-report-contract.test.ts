import { describe, expect, it } from "vitest";
import { generateKeyPairSync, randomBytes, sign, createHash } from "node:crypto";
import { gatewayRequestMessage, verifyGatewayRequest } from "../lib/cctv/gateway-request-auth";

describe("signed CCTV gateway request contract", () => {
  it("accepts an Ed25519 signature for the exact route and body", () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const homeId = "home", gatewayId = "gateway", method = "POST";
    const path = "/api/v1/homes/home/cctv-gateways/gateway/camera-reports";
    const timestamp = Date.now(), nonce = randomBytes(24).toString("base64url");
    const bodyHash = createHash("sha256").update('{"cameraId":"camera"}').digest("hex");
    const message = gatewayRequestMessage(homeId, gatewayId, method, path, timestamp, nonce, bodyHash);
    const signature = sign(null, message, privateKey).toString("base64url");
    const input = {
      homeId, gatewayId, method, path, timestamp, nonce, bodyHash, signature,
      publicKey: publicKey.export({ format: "pem", type: "spki" }).toString(),
    };
    expect(verifyGatewayRequest(input)).toBe(true);
    expect(verifyGatewayRequest({ ...input, path: path + "/other" })).toBe(false);
    expect(verifyGatewayRequest({ ...input, bodyHash: "0".repeat(64) })).toBe(false);
    expect(verifyGatewayRequest({ ...input, gatewayId: "other" })).toBe(false);
  });
});
