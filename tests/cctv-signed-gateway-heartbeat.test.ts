import { describe, expect, it } from "vitest";
import { generateKeyPairSync, randomBytes, sign } from "node:crypto";
import { gatewayHeartbeatMessage, verifySignedGatewayHeartbeat } from "../lib/cctv/gateway-signed-heartbeat";

const homeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const gatewayId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
describe("CCTV signed gateway heartbeat", () => {
  it("validates signed gateway/home/time/camera data and rejects tampering", () => {
    const pair = generateKeyPairSync("ed25519");
    const now = new Date("2026-10-19T18:00:00.000Z");
    const payload = { homeId, gatewayId, timestamp: now.toISOString(), nonce: randomBytes(24).toString("base64url"), cameraIds: [homeId] };
    const signature = sign(null, gatewayHeartbeatMessage(payload), pair.privateKey).toString("base64url");
    const publicKeyPem = pair.publicKey.export({ type: "spki", format: "pem" }).toString();
    const input = { ...payload, signature };
    expect(verifySignedGatewayHeartbeat(input, publicKeyPem, now)).toBe(true);
    expect(verifySignedGatewayHeartbeat({ ...input, homeId: gatewayId }, publicKeyPem, now)).toBe(false);
    expect(verifySignedGatewayHeartbeat({ ...input, cameraIds: [gatewayId] }, publicKeyPem, now)).toBe(false);
    expect(verifySignedGatewayHeartbeat({ ...input, nonce: randomBytes(24).toString("base64url") }, publicKeyPem, now)).toBe(false);
    expect(verifySignedGatewayHeartbeat(input, publicKeyPem, new Date(now.getTime() + 61_000))).toBe(false);
    expect(verifySignedGatewayHeartbeat({ ...input, cameraIds: [homeId, homeId] }, publicKeyPem, now)).toBe(false);
  });
});
