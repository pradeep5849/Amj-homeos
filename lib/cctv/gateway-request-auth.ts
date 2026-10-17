import { createPublicKey, verify } from "node:crypto";

export const CCTV_REQUEST_CLOCK_SKEW_MS = 2 * 60 * 1000;

export function gatewayRequestMessage(
  homeId: string, gatewayId: string, method: string, path: string,
  timestamp: number, nonce: string, bodyHash: string,
): Buffer {
  return Buffer.from(
    ["AMJ-CCTV-REQUEST-v1", homeId, gatewayId, method, path,
      String(timestamp), nonce, bodyHash].join("\n"), "utf8",
  );
}

export function verifyGatewayRequest(input: {
  homeId: string; gatewayId: string; method: string; path: string;
  timestamp: number; nonce: string; bodyHash: string; signature: string;
  publicKey: string; now?: number;
}): boolean {
  const now = input.now ?? Date.now();
  if (!Number.isSafeInteger(input.timestamp) || Math.abs(now - input.timestamp) > CCTV_REQUEST_CLOCK_SKEW_MS) return false;
  if (!/^[A-Za-z0-9_-]{22,86}$/.test(input.nonce)) return false;
  if (!/^[0-9a-f]{64}$/.test(input.bodyHash)) return false;
  if (!/^[A-Za-z0-9_-]{86}$/.test(input.signature)) return false;
  try {
    const key = createPublicKey(input.publicKey);
    if (key.asymmetricKeyType !== "ed25519") return false;
    const signature = Buffer.from(input.signature, "base64url");
    if (signature.length !== 64) return false;
    return verify(null, gatewayRequestMessage(input.homeId, input.gatewayId, input.method,
      input.path, input.timestamp, input.nonce, input.bodyHash), key, signature);
  } catch { return false; }
}
