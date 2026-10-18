import { createPublicKey, verify } from "node:crypto";
import { z } from "zod";

/**
 * Gateway agent proves possession of its private Ed25519 key by signing
 * the server-provided, short-lived challenge. This is a primitive, not
 * a complete pairing endpoint or replay-prevention service.
 */
export const gatewayProofSchema = z.object({
  gatewayId: z.uuid(),
  homeId: z.uuid(),
  challenge: z.string().regex(/^[A-Za-z0-9_-]{32,128}$/),
  signature: z.string().regex(/^[A-Za-z0-9_-]{86}$/),
}).strict();

export function gatewayProofMessage(input: { gatewayId: string; homeId: string; challenge: string }): Buffer {
  return Buffer.from(`amj:cctv:gateway-proof:v1\n${input.homeId}\n${input.gatewayId}\n${input.challenge}\n`, "utf8");
}

/** PEM public key must be an Ed25519 key. No RSA/ECDSA fallback. */
export function verifyGatewayProof(input: {
  publicKeyPem: string;
  gatewayId: string;
  homeId: string;
  challenge: string;
  signature: string;
}): boolean {
  const parsed = gatewayProofSchema.safeParse({
    gatewayId: input.gatewayId, homeId: input.homeId,
    challenge: input.challenge, signature: input.signature,
  });
  if (!parsed.success) return false;
  try {
    const key = createPublicKey(input.publicKeyPem);
    if (key.asymmetricKeyType !== "ed25519") return false;
    const signature = Buffer.from(input.signature, "base64url");
    if (signature.length !== 64) return false;
    return verify(null, gatewayProofMessage(input), key, signature);
  } catch { return false; }
}
