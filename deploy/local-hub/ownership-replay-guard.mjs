// In-memory replay protection for one gateway process. Production activation
// requires durable, transactional replay protection at the trusted authority.
export function createOwnershipReplayGuard({
  now = () => Date.now(),
  maxEntries = 1024,
} = {}) {
  if (!Number.isSafeInteger(maxEntries) || maxEntries < 1 || maxEntries > 100_000) {
    throw new Error("Invalid replay capacity");
  }
  const seen = new Map();
  function prune() {
    const time = now();
    for (const [key, expiry] of seen) {
      if (expiry <= time) seen.delete(key);
    }
  }
  function consume(challenge) {
    prune();
    if (!challenge || challenge.version !== 1 ||
        challenge.purpose !== "amj-gateway-ownership" ||
        typeof challenge.gatewayId !== "string" ||
        !/^[a-zA-Z0-9_-]{8,80}$/.test(challenge.gatewayId) ||
        typeof challenge.nonce !== "string" ||
        !/^[a-f0-9]{64}$/.test(challenge.nonce) ||
        !Number.isSafeInteger(challenge.expiresAt) ||
        challenge.expiresAt <= now()) return false;
    const key = challenge.gatewayId + ":" + challenge.nonce;
    if (seen.has(key) || seen.size >= maxEntries) return false;
    seen.set(key, challenge.expiresAt);
    return true;
  }
  return { consume };
}
