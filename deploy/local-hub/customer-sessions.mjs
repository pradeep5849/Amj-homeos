import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

/**
 * Prototype authorization for one local hub. Approval requires installer key.
 * Sessions are intentionally volatile, limited and short lived. Production
 * enrollment needs device-bound credentials, durable revocation and TLS.
 */
export function createCustomerSessionAuthority({ now = Date.now, ttlMs = 10 * 60_000, maxSessions = 16 } = {}) {
  const sessions = new Map();
  const hash = value => createHash("sha256").update(value).digest();
  function prune() {
    for (const [id, item] of sessions) if (item.expiresAt <= now()) sessions.delete(id);
  }
  return {
    issue({ clientId, allowedEntities }) {
      prune();
      if (typeof clientId !== "string" || !/^[a-zA-Z0-9_-]{8,64}$/.test(clientId))
        throw new Error("Invalid client identifier");
      if (!Array.isArray(allowedEntities) || allowedEntities.length === 0 ||
          allowedEntities.length > 128 || !allowedEntities.every(x => typeof x === "string"))
        throw new Error("Invalid approved entities");
      if (sessions.size >= maxSessions) throw new Error("Session limit reached");
      const id = randomBytes(16).toString("hex");
      const secret = randomBytes(32).toString("base64url");
      const expiresAt = now() + ttlMs;
      sessions.set(id, { secretHash: hash(secret), clientId, allowed: new Set(allowedEntities), expiresAt });
      return { sessionId: id, token: secret, expiresAt, clientId };
    },
    verify({ sessionId, token, entityId }) {
      prune();
      if (typeof sessionId !== "string" || typeof token !== "string" ||
          token.length > 256 || sessionId.length > 128) return false;
      const item = sessions.get(sessionId);
      if (!item || (entityId && !item.allowed.has(entityId))) return false;
      const actual = hash(token);
      return actual.length === item.secretHash.length && timingSafeEqual(actual, item.secretHash);
    },
    revoke(id) { return sessions.delete(id); },
    count() { prune(); return sessions.size; },
  };
}
