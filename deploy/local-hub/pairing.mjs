import { randomBytes, timingSafeEqual, createHash } from "node:crypto";

/**
 * Prototype local pairing authority. In-memory only: tokens expire and disappear on
 * hub restart. Production must use authenticated installer enrollment, device-bound
 * keys, secure persistence and TLS. Never expose bootstrap secret to RUVEXA.
 */
export function createLocalPairingAuthority(options = {}) {
  const ttlMs = options.ttlMs ?? 15 * 60 * 1000;
  const maxSessions = options.maxSessions ?? 8;
  const now = options.now ?? Date.now;
  const sessions = new Map();
  const digest = (value) => createHash("sha256").update(value).digest();
  const equal = (a, b) => a.length === b.length && timingSafeEqual(a, b);
  function prune() {
    for (const [key, item] of sessions) if (item.expiresAt <= now()) sessions.delete(key);
  }
  return {
    issue() {
      prune();
      if (sessions.size >= maxSessions) throw new Error("Pairing capacity reached");
      const token = randomBytes(32).toString("base64url");
      const sessionId = randomBytes(16).toString("hex");
      const expiresAt = now() + ttlMs;
      sessions.set(sessionId, { hash: digest(token), expiresAt });
      return { sessionId, token, expiresAt };
    },
    verify(sessionId, token) {
      if (typeof sessionId !== "string" || typeof token !== "string" ||
          token.length > 256 || sessionId.length > 128) return false;
      prune();
      const item = sessions.get(sessionId);
      return !!item && equal(item.hash, digest(token));
    },
    revoke(sessionId) { return sessions.delete(sessionId); },
    count() { prune(); return sessions.size; },
  };
}
