// Normalize a safe, read-only subset of Home Assistant entity states.
// Device pairing and physical Zigbee coordinator integration are not included.
const SUPPORTED_DOMAINS = new Set([
  "light", "switch", "fan", "sensor", "binary_sensor",
  "cover", "lock",
]);
const ENTITY_ID = /^([a-z][a-z0-9_]*)\.([a-z0-9_]+)$/;
const MAX_ENTITIES = 1000;
const UNITS = new Set(["°C", "°F", "%", "W", "kW", "kWh", "V", "A", "lx", "ppm", "Pa", "hPa"]);
const CATEGORIES = { light: "lighting", switch: "switches", fan: "fans", sensor: "sensors", binary_sensor: "sensors", cover: "curtains", lock: "security" };

export function normalizeHaEntities(states) {
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
    const name = typeof entry.attributes.friendly_name === "string"
      ? entry.attributes.friendly_name.slice(0, 128)
      : entry.entity_id;
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
      canToggle: ["light", "switch", "fan"].includes(match[1]) && !["unavailable", "unknown"].includes(entry.state),
    });
    if (entities.length >= MAX_ENTITIES) break;
  }
  return entities.sort((a, b) => a.entityId.localeCompare(b.entityId));
}
