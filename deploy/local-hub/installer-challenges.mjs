import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

const MAX_ACTIVE = 1;
const DEFAULT_TTL_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;

// Prototype building block: caller must require authenticated installer access
// AND hardware-confirmed physical presence before issuing a challenge.
export function createInstallerChallengeAuthority({
  now = () => Date.now(),
  ttlMs = DEFAULT_TTL_MS,
} = {}) {
  if (!Number.isSafeInteger(ttlMs) || ttlMs < 1_000 || ttlMs > 10 * 60_000) {
    throw new Error("Invalid challenge TTL");
  }
  const challenges = new Map();
  function clearExpired() {
    for (const [id, record] of challenges) {
      if (now() >= record.expiresAt || record.used) challenges.delete(id);
    }
  }
  function issue({ physicalPresenceVerified = false } = {}) {
    if (physicalPresenceVerified !== true) throw new Error("Physical presence required");
    clearExpired();
    if (challenges.size >= MAX_ACTIVE) throw new Error("Onboarding challenge already active");
    const id = randomBytes(16).toString("hex");
    const secret = randomBytes(32).toString("hex");
    const expiresAt = now() + ttlMs;
    challenges.set(id, {
      digest: createHash("sha256").update(secret).digest(),
      expiresAt,
      attempts: 0,
      used: false,
    });
    return { id, secret, expiresAt };
  }
  function consume(id, secret) {
    if (typeof id !== "string" || typeof secret !== "string") return false;
    const record = challenges.get(id);
    if (!record || record.used || now() >= record.expiresAt) {
      challenges.delete(id);
      return false;
    }
    record.attempts++;
    if (record.attempts >= MAX_ATTEMPTS) challenges.delete(id);
    const supplied = createHash("sha256").update(secret).digest();
    const matches = timingSafeEqual(supplied, record.digest);
    if (!matches) return false;
    challenges.delete(id);
    return true;
  }
  return { issue, consume };
}
