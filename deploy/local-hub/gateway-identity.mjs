import { createHash, createPublicKey } from "node:crypto";

// Fingerprint only: the expected fingerprint must be pinned through an
// authenticated manufacturing or enrollment channel, never self-asserted.
export function fingerprintGatewayPublicKey(publicKeyPem) {
  if (typeof publicKeyPem !== "string" || publicKeyPem.length > 4096) {
    throw new Error("Invalid gateway public key");
  }
  const key = createPublicKey(publicKeyPem);
  if (key.asymmetricKeyType !== "ed25519") throw new Error("Unsupported gateway key type");
  const der = key.export({ type: "spki", format: "der" });
  return "sha256:" + createHash("sha256").update(der).digest("hex");
}

export function verifyPinnedGatewayIdentity({
  publicKeyPem,
  expectedFingerprint,
} = {}) {
  if (typeof expectedFingerprint !== "string" ||
      !/^sha256:[0-9a-f]{64}$/.test(expectedFingerprint)) return false;
  try {
    return fingerprintGatewayPublicKey(publicKeyPem) === expectedFingerprint;
  } catch {
    return false;
  }
}
