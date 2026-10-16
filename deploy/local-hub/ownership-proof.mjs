import { generateKeyPairSync, createPublicKey, sign, verify, randomBytes } from "node:crypto";

// Prototype ownership-proof building block. Private keys must ultimately be
// generated and retained in hardware-backed gateway storage (TPM/secure element).
export function generateGatewayIdentity() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" });
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" });
  return { publicKeyPem, privateKeyPem };
}

export function createOwnershipChallenge({ gatewayId, now = Date.now(), ttlMs = 120_000 } = {}) {
  if (typeof gatewayId !== "string" || !/^[a-zA-Z0-9_-]{8,80}$/.test(gatewayId)) {
    throw new Error("Invalid gateway ID");
  }
  if (!Number.isSafeInteger(now) || !Number.isSafeInteger(ttlMs) ||
      ttlMs < 1000 || ttlMs > 300_000) throw new Error("Invalid challenge time");
  return {
    version: 1,
    purpose: "amj-gateway-ownership",
    gatewayId,
    nonce: randomBytes(32).toString("hex"),
    expiresAt: now + ttlMs,
  };
}

export function encodeOwnershipChallenge(challenge) {
  if (!challenge || challenge.version !== 1 ||
      challenge.purpose !== "amj-gateway-ownership" ||
      typeof challenge.gatewayId !== "string" ||
      !/^[a-zA-Z0-9_-]{8,80}$/.test(challenge.gatewayId) ||
      typeof challenge.nonce !== "string" || !/^[a-f0-9]{64}$/.test(challenge.nonce) ||
      !Number.isSafeInteger(challenge.expiresAt)) throw new Error("Invalid ownership challenge");
  return Buffer.from(JSON.stringify([
    challenge.version, challenge.purpose, challenge.gatewayId,
    challenge.nonce, challenge.expiresAt,
  ]), "utf8");
}

export function signOwnershipChallenge(privateKeyPem, challenge) {
  return sign(null, encodeOwnershipChallenge(challenge), privateKeyPem).toString("base64url");
}

export function verifyOwnershipSignature(publicKeyPem, challenge, signature, {
  now = Date.now(), expectedGatewayId,
} = {}) {
  if (typeof signature !== "string" || !/^[a-zA-Z0-9_-]{86}$/.test(signature)) return false;
  if (!Number.isSafeInteger(now) || challenge?.expiresAt <= now ||
      challenge?.gatewayId !== expectedGatewayId) return false;
  try {
    const key = createPublicKey(publicKeyPem);
    if (key.asymmetricKeyType !== "ed25519") return false;
    return verify(null, encodeOwnershipChallenge(challenge), key, Buffer.from(signature, "base64url"));
  } catch {
    return false;
  }
}
