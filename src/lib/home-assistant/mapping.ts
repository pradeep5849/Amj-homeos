import type { HaEntityState } from "./client";

/**
 * Pure mapping layer. No database writes, command dispatch, or network access.
 * Home Assistant's entity domain is NOT the physical radio protocol.
 */
export type AmjDiscoveredEntity = {
  provider: "HOME_ASSISTANT";
  externalId: string;
  name: string;
  deviceType: "LIGHT" | "SWITCH" | "FAN" | "SENSOR" | "OTHER";
  capabilities: Record<string, { readable: boolean; writable: boolean; min?: number; max?: number }>;
  state: Record<string, boolean | number | string | null>;
  available: boolean;
  metadata: { domain: string; entityId: string };
};

const supported = new Set(["light", "switch", "fan", "binary_sensor", "sensor"]);
const validEntityId = /^[a-z][a-z0-9_]*\.[a-z0-9_]+$/;

export function mapHomeAssistantEntity(entity: HaEntityState): AmjDiscoveredEntity | null {
  if (!validEntityId.test(entity.entity_id)) return null;
  const [domain] = entity.entity_id.split(".");
  if (!supported.has(domain)) return null;
  const available = entity.state !== "unavailable" && entity.state !== "unknown";
  const name = typeof entity.attributes.friendly_name === "string" && entity.attributes.friendly_name.trim()
    ? entity.attributes.friendly_name.trim()
    : entity.entity_id;
  const capabilities: AmjDiscoveredEntity["capabilities"] = {};
  const state: AmjDiscoveredEntity["state"] = {};

  if (domain === "light" || domain === "switch" || domain === "fan") {
    capabilities.power = { readable: true, writable: true };
    state.power = available ? entity.state === "on" : null;
  }
  if (domain === "light" && typeof entity.attributes.brightness === "number") {
    capabilities.brightness = { readable: true, writable: true, min: 0, max: 100 };
    state.brightness = available
      ? Math.round(Math.min(255, Math.max(0, entity.attributes.brightness)) * 100 / 255)
      : null;
  }
  if (domain === "fan" && typeof entity.attributes.percentage === "number") {
    capabilities.speed = { readable: true, writable: true, min: 0, max: 100 };
    state.speed = available ? Math.min(100, Math.max(0, entity.attributes.percentage)) : null;
  }
  if (domain === "binary_sensor") {
    capabilities.contact = { readable: true, writable: false };
    state.contact = available ? entity.state === "on" : null;
  }
  if (domain === "sensor") {
    const unit = entity.attributes.unit_of_measurement;
    const numeric = Number(entity.state);
    if (typeof unit !== "string" || !Number.isFinite(numeric) || !available) return null;
    const key = unit === "°C" ? "temperature" : unit === "%" ? "humidity" : null;
    if (!key) return null;
    capabilities[key] = { readable: true, writable: false };
    state[key] = numeric;
  }

  return {
    provider: "HOME_ASSISTANT",
    externalId: entity.entity_id,
    name,
    deviceType: domain === "light" ? "LIGHT" : domain === "switch" ? "SWITCH" : domain === "fan" ? "FAN" : ["sensor", "binary_sensor"].includes(domain) ? "SENSOR" : "OTHER",
    capabilities,
    state,
    available,
    metadata: { domain, entityId: entity.entity_id },
  };
}

export function mapHomeAssistantStates(entities: HaEntityState[]): AmjDiscoveredEntity[] {
  const byId = new Map<string, AmjDiscoveredEntity>();
  for (const entity of entities) {
    const mapped = mapHomeAssistantEntity(entity);
    if (mapped) byId.set(mapped.externalId, mapped);
  }
  return [...byId.values()];
}

/** Translate validated logical commands; actual authorization must happen in AMJ's device service. */
export function mapAmjCommandToHa(
  entityId: string,
  command: "setPower" | "setBrightness" | "setSpeed",
  value: unknown,
): { domain: string; service: string; entityId: string; data: Record<string, unknown> } {
  if (!validEntityId.test(entityId)) throw new Error("Invalid Home Assistant entity ID");
  const [domain] = entityId.split(".");
  if (command === "setPower" && ["light", "switch", "fan"].includes(domain) && typeof value === "boolean") {
    return { domain, service: value ? "turn_on" : "turn_off", entityId, data: {} };
  }
  if (command === "setBrightness" && domain === "light" && typeof value === "number" &&
      Number.isFinite(value) && value >= 0 && value <= 100) {
    return { domain, service: "turn_on", entityId, data: { brightness_pct: value } };
  }
  if (command === "setSpeed" && domain === "fan" && typeof value === "number" &&
      Number.isFinite(value) && value >= 0 && value <= 100) {
    return { domain, service: "set_percentage", entityId, data: { percentage: value } };
  }
  throw new Error("Unsupported Home Assistant command or invalid value");
}
