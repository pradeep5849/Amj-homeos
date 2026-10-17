import { createHash, createPublicKey, verify } from "node:crypto";
import { z } from "zod";

export const gatewayEnrollmentSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  publicKey: z.string().min(80).max(512),
  signature: z.string().regex(/^[A-Za-z0-9_-]{80,120}$/),
}).strict();

/** Bind proof of possession to the exact gateway and one-time challenge. */
export function enrollmentMessage(homeId: string, gatewayId: string, token: string): Buffer {
  return Buffer.from("AMJ-CCTV-ENROLL-v1\n" + homeId + "\n" + gatewayId + "\n" + token, "utf8");
}

export function verifyEnrollmentSignature(
  homeId: string, gatewayId: string, token: string, publicKeyPem: string, signatureBase64url: string,
): boolean {
  try {
    const key = createPublicKey(publicKeyPem);
    if (key.asymmetricKeyType !== "ed25519") return false;
    const signature = Buffer.from(signatureBase64url, "base64url");
    if (signature.length !== 64) return false;
    return verify(null, enrollmentMessage(homeId, gatewayId, token), key, signature);
  } catch { return false; }
}

export function gatewayPublicKeyFingerprint(publicKeyPem: string): string {
  const key = createPublicKey(publicKeyPem);
  if (key.asymmetricKeyType !== "ed25519") throw new Error("Unsupported gateway key");
  return createHash("sha256").update(key.export({ type: "spki", format: "der" })).digest("hex");
}
