import { createHash, randomBytes } from "node:crypto";

/** Store a digest, never the raw authentication challenge. */
export function newGatewayChallenge(): string {
  return randomBytes(32).toString("base64url");
}

export function gatewayChallengeDigest(challenge: string): string {
  if (!/^[A-Za-z0-9_-]{43}$/.test(challenge)) throw new Error("Invalid CCTV gateway challenge");
  return createHash("sha256").update("amj:cctv:challenge:v1\0").update(challenge).digest("hex");
}

export function gatewayChallengeUsable(input: { expiresAt: Date; consumedAt: Date | null; now: Date }): boolean {
  return input.consumedAt === null && Number.isFinite(input.expiresAt.getTime())
    && input.expiresAt.getTime() > input.now.getTime();
}
