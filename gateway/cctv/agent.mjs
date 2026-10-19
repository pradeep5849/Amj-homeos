#!/usr/bin/env node
/**
 * Local CCTV gateway agent MVP: signed heartbeat transport only.
 * Node.js 22+. No camera discovery, credentials, streams, recordings or PTZ.
 */
import { createPrivateKey, randomBytes, sign } from "node:crypto";
import { readFile } from "node:fs/promises";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function heartbeatMessage(payload) {
  return Buffer.from(JSON.stringify({
    domain: "amj:cctv:heartbeat:v1",
    homeId: payload.homeId,
    gatewayId: payload.gatewayId,
    timestamp: payload.timestamp,
    nonce: payload.nonce,
    cameraIds: [...payload.cameraIds].sort(),
  }), "utf8");
}

export function signedHeartbeat({ homeId, gatewayId, privateKey, cameraIds = [], now = new Date() }) {
  if (!uuid.test(homeId) || !uuid.test(gatewayId)) throw new Error("Invalid home or gateway UUID");
  if (!Array.isArray(cameraIds) || cameraIds.length > 256 || cameraIds.some(id => !uuid.test(id)) || new Set(cameraIds).size !== cameraIds.length) {
    throw new Error("Invalid camera IDs");
  }
  const key = createPrivateKey(privateKey);
  if (key.asymmetricKeyType !== "ed25519") throw new Error("Ed25519 private key required");
  const payload = { homeId, gatewayId, timestamp: now.toISOString(), nonce: randomBytes(24).toString("base64url"), cameraIds };
  return { ...payload, signature: sign(null, heartbeatMessage(payload), key).toString("base64url") };
}

export function heartbeatUrl(baseUrl, homeId, gatewayId) {
  const base = new URL(baseUrl);
  if (base.protocol !== "https:" && !(base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname))) {
    throw new Error("Gateway API requires HTTPS outside localhost");
  }
  if (base.username || base.password || base.search || base.hash) throw new Error("Invalid gateway API URL");
  const endpoint = new URL(base);
  endpoint.pathname = `/api/v1/homes/${homeId}/cctv-enrolled-gateways/${gatewayId}/heartbeat`;
  return endpoint;
}

export async function sendHeartbeat({ baseUrl, homeId, gatewayId, privateKey, fetchImpl = fetch, signal }) {
  const url = heartbeatUrl(baseUrl, homeId, gatewayId);
  const body = signedHeartbeat({ homeId, gatewayId, privateKey });
  const response = await fetchImpl(url, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), signal,
  });
  if (!response.ok) throw new Error(`Heartbeat rejected (HTTP ${response.status})`);
  const result = await response.json();
  if (result.accepted !== true) throw new Error("Gateway heartbeat not accepted");
  return result;
}

export async function main(env = process.env) {
  const { CCTV_API_BASE_URL: baseUrl, CCTV_HOME_ID: homeId, CCTV_GATEWAY_ID: gatewayId, CCTV_PRIVATE_KEY_FILE: keyFile } = env;
  if (!baseUrl || !homeId || !gatewayId || !keyFile) {
    throw new Error("Set CCTV_API_BASE_URL, CCTV_HOME_ID, CCTV_GATEWAY_ID, CCTV_PRIVATE_KEY_FILE");
  }
  const privateKey = await readFile(keyFile, "utf8");
  const intervalMs = 30_000;
  let stopped = false;
  const stop = () => { stopped = true; };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  while (!stopped) {
    try {
      await sendHeartbeat({ baseUrl, homeId, gatewayId, privateKey, signal: AbortSignal.timeout(10_000) });
      process.stdout.write(`[${new Date().toISOString()}] Gateway heartbeat accepted\n`);
    } catch (error) {
      process.stderr.write(`[${new Date().toISOString()}] Gateway heartbeat failed: ${error.message}\n`);
    }
    if (stopped) break;
    await new Promise(resolve => {
      const timer = setTimeout(resolve, intervalMs);
      timer.unref?.();
      const poll = setInterval(() => { if (stopped) { clearTimeout(timer); clearInterval(poll); resolve(); } }, 1000);
      poll.unref?.();
    });
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
