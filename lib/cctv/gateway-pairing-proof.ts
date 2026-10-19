import { createHash, createPublicKey, verify } from "node:crypto";

/** Pairing proof binds a gateway's Ed25519 key to a home and one-time code. */
export function gatewayPairingMessage(input: {
  homeId: string; code: string; publicKeyPem: string;
}): Buffer {
  const key = createPublicKey(input.publicKeyPem);
  if (key.asymmetricKeyType !== "ed25519") throw new Error("Ed25519 key required");
  const fingerprint = createHash("sha256").update(key.export({ type: "spki", format: "der" })).digest("hex");
  return Buffer.from(`amj:cctv:pairing:v1\n${input.homeId}\n${input.code}\n${fingerprint}\n`, "utf8");
}

export function verifyGatewayPairingProof(input: {
  homeId: string; code: string; publicKeyPem: string; signature: string;
}): boolean {
  if (!/^[A-Za-z0-9_-]{86}$/.test(input.signature)) return false;
  try {
    const key = createPublicKey(input.publicKeyPem);
    if (key.asymmetricKeyType !== "ed25519") return false;
    const signature = Buffer.from(input.signature, "base64url");
    return signature.length === 64 && verify(null, gatewayPairingMessage(input), key, signature);
  } catch { return false; }
}
