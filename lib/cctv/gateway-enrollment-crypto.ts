import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** One-time enrollment codes must never be stored in plaintext or logs. */
export function newGatewayEnrollmentCode(): string {
  return randomBytes(32).toString("base64url");
}

/** Hash with a mandatory server-side pepper, stored outside the database. */
export function hashGatewayEnrollmentCode(code: string, pepper: string): string {
  if (pepper.length < 32) throw new Error("Gateway enrollment pepper must be at least 32 characters");
  if (!/^[A-Za-z0-9_-]{43}$/.test(code)) throw new Error("Invalid gateway enrollment code");
  return createHash("sha256").update("amj:cctv:enrollment:v1\0").update(pepper).update("\0").update(code).digest("hex");
}

export function verifyGatewayEnrollmentCode(code: string, storedHash: string, pepper: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(storedHash)) return false;
  try {
    const computed = hashGatewayEnrollmentCode(code, pepper);
    return timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(storedHash, "hex"));
  } catch { return false; }
}

/** Cryptographic helper only. Consumption must be an atomic database operation. */
export function gatewayEnrollmentCodeUsable(input: {
  expiresAt: Date;
  consumedAt: Date | null;
  revokedAt: Date | null;
  now: Date;
}): boolean {
  return input.consumedAt === null && input.revokedAt === null
    && Number.isFinite(input.expiresAt.getTime())
    && input.expiresAt.getTime() > input.now.getTime();
}
