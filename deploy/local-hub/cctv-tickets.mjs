import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

// A short-lived, one-use authorization ticket for a single camera and purpose.
// This module NEVER returns RTSP URLs, device passwords or HA credentials.
const CAMERA = /^camera\.[a-z0-9_]+$/;
const PURPOSES = new Set(["live", "recordingPlayback"]);
export function createCctvTicketAuthority({ now = Date.now, ttlMs = 30_000, maxTickets = 64 } = {}) {
  const tickets = new Map();
  const digest = value => createHash("sha256").update(value).digest();
  const prune = () => {
    for (const [id, entry] of tickets) if (entry.expiresAt <= now()) tickets.delete(id);
  };
  return {
    issue({ entityId, purpose, sessionId }) {
      prune();
      if (typeof entityId !== "string" || !CAMERA.test(entityId) ||
          !PURPOSES.has(purpose) || typeof sessionId !== "string" ||
          !/^[a-f0-9]{32}$/.test(sessionId) || tickets.size >= maxTickets)
        throw new Error("Invalid CCTV ticket request");
      const ticketId = randomBytes(16).toString("hex");
      const secret = randomBytes(32).toString("base64url");
      const expiresAt = now() + ttlMs;
      tickets.set(ticketId, { entityId, purpose, sessionHash: digest(sessionId),
        secretHash: digest(secret), expiresAt });
      return { ticketId, token: secret, entityId, purpose, expiresAt };
    },
    consume({ ticketId, token, entityId, purpose, sessionId }) {
      prune();
      if (typeof ticketId !== "string" || !/^[a-f0-9]{32}$/.test(ticketId) ||
          typeof token !== "string" || token.length > 256 ||
          typeof sessionId !== "string") return false;
      const entry = tickets.get(ticketId);
      if (!entry || entry.entityId !== entityId || entry.purpose !== purpose) return false;
      const tokenHash = digest(token);
      const sessionHash = digest(sessionId);
      const valid = timingSafeEqual(tokenHash, entry.secretHash) &&
        timingSafeEqual(sessionHash, entry.sessionHash);
      if (valid) tickets.delete(ticketId);
      return valid;
    },
    revokeSession(sessionId) {
      const hash = digest(sessionId);
      for (const [id, entry] of tickets)
        if (timingSafeEqual(hash, entry.sessionHash)) tickets.delete(id);
    },
    count() { prune(); return tickets.size; },
  };
}
