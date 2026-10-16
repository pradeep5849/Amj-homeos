/** Restrict prototype relay control to explicitly allowed HA entities. */
const ENTITY_ID = /^(switch|light)\.[a-z0-9_]+$/;
export function parseAllowedRelayCommand(value, allowlist) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const keys = Object.keys(value);
  if (keys.length !== 2 || !keys.includes("entityId") || !keys.includes("power")) return null;
  if (typeof value.entityId !== "string" || !ENTITY_ID.test(value.entityId)) return null;
  if (!allowlist.has(value.entityId) || typeof value.power !== "boolean") return null;
  const [domain] = value.entityId.split(".");
  return { domain, entityId: value.entityId, service: value.power ? "turn_on" : "turn_off" };
}
