import { describe, expect, it, vi } from "vitest";
import { generateKeyPairSync, verify } from "node:crypto";
import { heartbeatMessage, heartbeatUrl, signedHeartbeat, sendHeartbeat } from "../gateway/cctv/agent.mjs";

const homeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const gatewayId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const keys = generateKeyPairSync("ed25519");
const privateKey = keys.privateKey.export({ type: "pkcs8", format: "pem" }).toString();

describe("local CCTV gateway agent", () => {
  it("signs the same canonical heartbeat message as the API", () => {
    const input = signedHeartbeat({ homeId, gatewayId, privateKey });
    expect(input.cameraIds).toEqual([]);
    expect(verify(null, heartbeatMessage(input), keys.publicKey, Buffer.from(input.signature, "base64url"))).toBe(true);
    expect(input.nonce).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });
  it("requires TLS except localhost and disallows URL credentials", () => {
    expect(() => heartbeatUrl("http://example.com", homeId, gatewayId)).toThrow();
    expect(() => heartbeatUrl("https://user:pass@example.com", homeId, gatewayId)).toThrow();
    expect(heartbeatUrl("https://example.com", homeId, gatewayId).pathname).toContain("/heartbeat");
  });
  it("sends signed heartbeat and fails closed on server rejection", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ accepted: true }) });
    await sendHeartbeat({ baseUrl: "https://example.com", homeId, gatewayId, privateKey, fetchImpl });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url.protocol).toBe("https:");
    const body = JSON.parse(init.body);
    expect(verify(null, heartbeatMessage(body), keys.publicKey, Buffer.from(body.signature, "base64url"))).toBe(true);
    fetchImpl.mockResolvedValueOnce({ ok: false, status: 401 });
    await expect(sendHeartbeat({ baseUrl: "https://example.com", homeId, gatewayId, privateKey, fetchImpl })).rejects.toThrow("401");
  });
});
