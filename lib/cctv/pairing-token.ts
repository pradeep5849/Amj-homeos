import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * CCTV pairing challenges are opaque, single-use credentials.
 * Persist only their HMAC digests; never log or persist raw tokens.
 * Database redemption must still be atomic and enforce expiration.
 */
export const CCTV_PAIRING_TOKEN_BYTES = 32;
export const CCTV_PAIRING_TTL_MS = 5 * 60 * 1000;

export function createPairingToken(): string {
  return randomBytes(CCTV_PAIRING_TOKEN_BYTES).toString("base64url");
}

/**
 * HMAC key must be a separate, server-only 32+ byte secret obtained from
 * the configured secrets manager, not a static value committed to source.
 */
export function digestPairingToken(token: string, hmacKey: Buffer): string {
  if (hmacKey.length < 32) throw new Error("Pairing HMAC key is too short");
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error("Invalid pairing token");
  return createHmac("sha256", hmacKey).update(token, "utf8").digest("hex");
}

export function pairingTokenMatches(token: string, expectedDigest: string, hmacKey: Buffer): boolean {
  if (!/^[0-9a-f]{64}$/.test(expectedDigest)) return false;
  try {
    const actual = Buffer.from(digestPairingToken(token, hmacKey), "hex");
    return timingSafeEqual(actual, Buffer.from(expectedDigest, "hex"));
  } catch {
    return false;
  }
}
