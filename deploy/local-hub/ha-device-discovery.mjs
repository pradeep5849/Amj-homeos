// Normalize a safe, read-only subset of Home Assistant entity states.
// Device pairing and physical Zigbee coordinator integration are not included.
const SUPPORTED_DOMAINS = new Set([
  "light", "switch", "fan", "sensor", "binary_sensor",
  "cover", "lock",
]);
const ENTITY_ID = /^([a-z][a-z0-9_]*)\.([a-z0-9_]+)$/;
const MAX_ENTITIES = 1000;
const MAX_NAME_LENGTH = 128;
const SAFE_DEVICE_CLASSES = new Set(["temperature", "humidity", "motion", "occupancy", "door", "window", "battery", "power", "energy", "illuminance", "smoke", "moisture", "connectivity"]);
const POWER_DOMAINS = new Set(["light", "switch", "fan"]);
const isPlainText = (value) => typeof value === "string" && !/[\x00-\x1f\x7f]/.test(value);
const safeName = (value, fallback) => isPlainText(value) && value.trim() ? value.trim().slice(0, MAX_NAME_LENGTH) : fallback;
const UNITS = new Set(["°C", "°F", "%", "W", "kW", "kWh", "V", "A", "lx", "ppm", "Pa", "hPa"]);
const CATEGORIES = { light: "lighting", switch: "switches", fan: "fans", sensor: "sensors", binary_sensor: "sensors", cover: "curtains", lock: "security" };

export function normalizeHaEntities(states, { fanStages = new Map() } = {}) {
  if (!Array.isArray(states)) throw new Error("Invalid Home Assistant states");
  if (states.length > 10_000) throw new Error("Home Assistant state list too large");
  const entities = [];
  const seen = new Set();
  for (const entry of states) {
    if (!entry || typeof entry.entity_id !== "string" ||
        typeof entry.state !== "string" || entry.state.length > 128 ||
        !entry.attributes || typeof entry.attributes !== "object" ||
        Array.isArray(entry.attributes)) continue;
    const match = ENTITY_ID.exec(entry.entity_id);
    if (!match || !SUPPORTED_DOMAINS.has(match[1]) || seen.has(entry.entity_id)) continue;
    const name = safeName(entry.attributes.friendly_name, entry.entity_id);
    const online = entry.state !== "unavailable" && entry.state !== "unknown";
    seen.add(entry.entity_id);
    entities.push({
      entityId: entry.entity_id,
      domain: match[1],
      name,
      state: entry.state,
      available: entry.state !== "unavailable" && entry.state !== "unknown",
      deviceKey: entry.entity_id,
      category: CATEGORIES[match[1]],
      availabilityStatus: entry.state === "unavailable" ? "offline" : entry.state === "unknown" ? "unknown" : "online",
      unit: match[1] === "sensor" && UNITS.has(entry.attributes.unit_of_measurement) ? entry.attributes.unit_of_measurement : null,
      canToggle: POWER_DOMAINS.has(match[1]) && online,
      // Additional read-only fields; never forward HA attribute objects.
      displayName: name,
      isOnline: online,
      isOn: POWER_DOMAINS.has(match[1]) && online ? entry.state === "on" : null,
      isReadOnly: !POWER_DOMAINS.has(match[1]),
      deviceClass: SAFE_DEVICE_CLASSES.has(entry.attributes.device_class) ? entry.attributes.device_class : null,
      supportsPowerControl: POWER_DOMAINS.has(match[1]),
      supportsFanSpeed: match[1] === "fan" && online && [4, 5].includes(fanStages.get(entry.entity_id)) && Number.isInteger(entry.attributes.supported_features) && (entry.attributes.supported_features & 1) !== 0,
      fanSpeedStages: match[1] === "fan" ? fanStages.get(entry.entity_id) ?? null : null,
      fanSpeedStage: match[1] === "fan" && [4, 5].includes(fanStages.get(entry.entity_id)) && Number.isFinite(entry.attributes.percentage) && entry.attributes.percentage > 0 && entry.attributes.percentage <= 100 ? Math.max(1, Math.min(fanStages.get(entry.entity_id), Math.round(entry.attributes.percentage * fanStages.get(entry.entity_id) / 100))) : null,
      fanSpeedPercentage: match[1] === "fan" && online && Number.isInteger(entry.attributes.percentage) && entry.attributes.percentage >= 0 && entry.attributes.percentage <= 100 ? entry.attributes.percentage : null,
      isSensor: match[1] === "sensor" || match[1] === "binary_sensor",
      isSecurityDevice: match[1] === "lock",
      isCurtain: match[1] === "cover",
      source: "home_assistant",
    });
    if (entities.length >= MAX_ENTITIES) break;
  }
  return entities.sort((a, b) => a.entityId.localeCompare(b.entityId));
}
