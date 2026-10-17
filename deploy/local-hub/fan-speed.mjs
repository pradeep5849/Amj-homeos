// UI uses discrete stages; HA receives a translated percentage.
// Stage counts must be explicitly configured for each fan (4 or 5).
const FAN_ID = /^fan\.[a-z0-9_]+$/;
export function parseFanStageConfig(raw = "") {
  const result = new Map();
  if (!raw.trim()) return result;
  for (const item of raw.split(",")) {
    const [entityId, count, ...extra] = item.trim().split(":");
    if (extra.length || !FAN_ID.test(entityId) || !["4", "5", "percentage"].includes(count) || result.has(entityId))
      throw new Error("Invalid fan stage configuration");
    result.set(entityId, count === "percentage" ? "percentage" : Number(count));
  }
  return result;
}
export function parseAllowedFanSpeed(value, allowlist, stages) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const keys = Object.keys(value).sort().join(",");
  if (keys !== "entityId,stage" && keys !== "entityId,percentage") return null;
  if (typeof value.entityId !== "string" || !FAN_ID.test(value.entityId) ||
      !allowlist.has(value.entityId)) return null;
  const count = stages.get(value.entityId);
  if (count === "percentage") {
    if (keys !== "entityId,percentage" || !Number.isInteger(value.percentage) ||
        value.percentage < 0 || value.percentage > 100) return null;
    return { entityId: value.entityId, percentage: value.percentage };
  }
  if (keys !== "entityId,stage" || ![4, 5].includes(count) || !Number.isInteger(value.stage) ||
      value.stage < 1 || value.stage > count) return null;
  return { entityId: value.entityId, stage: value.stage,
    percentage: Math.round(value.stage * 100 / count) };
}
