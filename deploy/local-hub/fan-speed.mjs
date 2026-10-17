// Fan speed requests are strictly bounded and restricted to explicitly
// configured fan entities. Percentages are integer steps of 10.
const FAN_ID = /^fan\.[a-z0-9_]+$/;
export function parseAllowedFanSpeed(value, allowlist) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (Object.keys(value).sort().join(",") !== "entityId,percentage") return null;
  if (typeof value.entityId !== "string" || !FAN_ID.test(value.entityId) ||
      !allowlist.has(value.entityId) ||
      !Number.isInteger(value.percentage) || value.percentage < 0 ||
      value.percentage > 100 || value.percentage % 10 !== 0) return null;
  return { entityId: value.entityId, percentage: value.percentage };
}
