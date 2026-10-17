// Fixed command shape, allowlisted cover, and bounded position.
// HA cover position uses 0=closed and 100=open.
const COVER_ID = /^cover\.[a-z0-9_]+$/;
export function parseAllowedCurtainPosition(value, allowlist) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).sort().join(",") !== "entityId,position" ||
      typeof value.entityId !== "string" || !COVER_ID.test(value.entityId) ||
      !allowlist.has(value.entityId) || !Number.isInteger(value.position) ||
      value.position < 0 || value.position > 100) return null;
  return { entityId: value.entityId, position: value.position };
}
