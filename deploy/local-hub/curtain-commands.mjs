// Restrict curtain commands to installer-approved covers and fixed safe actions.
// No arbitrary Home Assistant service names or positions are accepted.
const COVER_ID = /^cover\.[a-z0-9_]+$/;
const ACTIONS = new Map([["open", "open_cover"], ["close", "close_cover"], ["stop", "stop_cover"]]);
export function parseAllowedCurtainCommand(value, allowlist) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).sort().join(",") !== "action,entityId" ||
      typeof value.entityId !== "string" || !COVER_ID.test(value.entityId) ||
      !allowlist.has(value.entityId) || !ACTIONS.has(value.action)) return null;
  return { entityId: value.entityId, action: value.action, service: ACTIONS.get(value.action) };
}
