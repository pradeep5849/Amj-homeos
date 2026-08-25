import { randomUUID } from "node:crypto";
import type { DeviceHealthStatus, TelemetryMetric, TelemetryQuality, TelemetrySource } from "@prisma/client";
import { prisma } from "./db";
import { HttpError } from "./errors";

export const TELEMETRY_BOUNDS: Record<TelemetryMetric, readonly [number, number]> = {
  POWER_WATTS: [0, 10_000_000], ENERGY_WH: [0, 10_000_000], VOLTAGE_VOLTS: [0, 10_000], CURRENT_AMPS: [0, 100_000],
  TEMPERATURE_C: [-100, 200], HUMIDITY_PERCENT: [0, 100], BATTERY_PERCENT: [0, 100], SIGNAL_RSSI_DBM: [-200, 0],
};
export const METRIC_UNITS: Record<TelemetryMetric, string> = { POWER_WATTS: "W", ENERGY_WH: "Wh", VOLTAGE_VOLTS: "V", CURRENT_AMPS: "A", TEMPERATURE_C: "°C", HUMIDITY_PERCENT: "%", BATTERY_PERCENT: "%", SIGNAL_RSSI_DBM: "dBm" };
const METRIC_CAPABILITY: Partial<Record<TelemetryMetric, string[]>> = { POWER_WATTS: ["powerMeasurement", "energy"], ENERGY_WH: ["energy"], VOLTAGE_VOLTS: ["voltage", "energy"], CURRENT_AMPS: ["current", "energy"], TEMPERATURE_C: ["temperature"], HUMIDITY_PERCENT: ["humidity"], BATTERY_PERCENT: ["battery"], SIGNAL_RSSI_DBM: ["signal"] };
const MAX_FUTURE_MS = 5 * 60_000;
export const HEALTH_STALE_MS = 15 * 60_000;
export const RAW_RETENTION_DAYS = 90;

type TrustedTelemetry = { deviceId: string; metric: TelemetryMetric; value: number; recordedAt: Date; source: TelemetrySource; provider: string; externalEventId?: string; quality?: TelemetryQuality };
type Heartbeat = { deviceId: string; recordedAt: Date; provider: string; externalEventId?: string; source?: TelemetrySource };

function validateReading(input: TrustedTelemetry) {
  if (!Number.isFinite(input.value)) throw new HttpError(400, "Telemetry value must be finite");
  const [minimum, maximum] = TELEMETRY_BOUNDS[input.metric];
  if (input.value < minimum || input.value > maximum) throw new HttpError(400, `Telemetry value outside ${input.metric} bounds`);
  if (input.recordedAt.getTime() > Date.now() + MAX_FUTURE_MS) throw new HttpError(400, "Telemetry timestamp is too far in the future");
  if ((input.source === "TEST" || input.quality === "TEST") && process.env.NODE_ENV !== "test") throw new HttpError(503, "TEST_TELEMETRY_NOT_AVAILABLE");
  if (!input.provider.trim() || input.provider.length > 64) throw new HttpError(400, "Invalid telemetry provider");
}

async function notifyHealth(deviceId: string, status: DeviceHealthStatus, reason: string) {
  const device = await prisma.device.findUniqueOrThrow({ where: { id: deviceId }, select: { id: true, homeId: true, name: true, healthStatus: true } });
  if (device.healthStatus === status) return;
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.device.updateMany({ where: { id: deviceId, healthStatus: { not: status } }, data: { healthStatus: status, healthReason: reason, lastHealthChangeAt: new Date(), isOnline: status === "ONLINE" || status === "DEGRADED" } });
    if (claimed.count === 0) return;
    await tx.deviceHealthEvent.create({ data: { deviceId, homeId: device.homeId, status, reason } });
    const members = await tx.homeMembership.findMany({ where: { homeId: device.homeId, user: { isActive: true } }, select: { userId: true, user: { select: { notificationPreference: { select: { inAppEnabled: true, deviceEventsEnabled: true } } } } } });
    const recipients = members.filter(({ user }) => user.notificationPreference?.inAppEnabled !== false && user.notificationPreference?.deviceEventsEnabled !== false);
    if (recipients.length) await tx.notification.createMany({ data: recipients.map(({ userId }) => ({ userId, homeId: device.homeId, type: "DEVICE" as const, severity: status === "ONLINE" ? "INFO" as const : "WARNING" as const, title: status === "ONLINE" ? `${device.name} is back online` : status === "OFFLINE" ? `${device.name} is offline` : `${device.name} needs attention`, body: reason, metadata: { deviceId, healthStatus: status } })) });
  });
}

export async function ingestTelemetry(input: TrustedTelemetry) {
  validateReading(input);
  const device = await prisma.device.findUnique({ where: { id: input.deviceId }, select: { id: true, homeId: true, capabilities: true, isArchived: true, lastTelemetryAt: true } });
  if (!device || device.isArchived) throw new HttpError(404, "Active Device not found");
  const capabilities = Array.isArray(device.capabilities) ? device.capabilities.filter((v): v is string => typeof v === "string") : [];
  const required = METRIC_CAPABILITY[input.metric] ?? [];
  if (required.length && !required.some((capability) => capabilities.includes(capability))) throw new HttpError(400, `Device does not support ${input.metric}`);
  try {
    const reading = await prisma.deviceTelemetry.create({ data: { deviceId: device.id, homeId: device.homeId, metric: input.metric, value: input.value, unit: METRIC_UNITS[input.metric], recordedAt: input.recordedAt, source: input.source, provider: input.provider, externalEventId: input.externalEventId, quality: input.quality ?? (input.source === "TEST" ? "TEST" : "MEASURED") } });
    if (!device.lastTelemetryAt || input.recordedAt > device.lastTelemetryAt) {
      await prisma.device.update({ where: { id: device.id }, data: { lastTelemetryAt: input.recordedAt, lastSeenAt: input.recordedAt } });
      await notifyHealth(device.id, input.metric === "BATTERY_PERCENT" && input.value <= 20 ? "DEGRADED" : "ONLINE", input.metric === "BATTERY_PERCENT" && input.value <= 20 ? `Low battery: ${input.value}%` : "Trusted telemetry received");
    }
    return { reading, duplicate: false };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002" && input.externalEventId) {
      const reading = await prisma.deviceTelemetry.findFirstOrThrow({ where: { deviceId: input.deviceId, provider: input.provider, source: input.source, externalEventId: input.externalEventId } });
      return { reading, duplicate: true };
    }
    throw error;
  }
}

export async function ingestHeartbeat(input: Heartbeat) {
  if (input.source === "TEST" && process.env.NODE_ENV !== "test") throw new HttpError(503, "TEST_TELEMETRY_NOT_AVAILABLE");
  if (input.recordedAt.getTime() > Date.now() + MAX_FUTURE_MS) throw new HttpError(400, "Heartbeat timestamp is too far in the future");
  const device = await prisma.device.findUnique({ where: { id: input.deviceId }, select: { id: true, isArchived: true, lastSeenAt: true } });
  if (!device || device.isArchived) throw new HttpError(404, "Active Device not found");
  if (!device.lastSeenAt || input.recordedAt > device.lastSeenAt) {
    await prisma.device.update({ where: { id: device.id }, data: { lastSeenAt: input.recordedAt } });
    await notifyHealth(device.id, "ONLINE", "Trusted provider heartbeat received");
  }
  return prisma.device.findUniqueOrThrow({ where: { id: device.id } });
}

export class TestTelemetryProvider {
  readonly provider = "HOMEOS_TEST";
  constructor() { if (process.env.NODE_ENV !== "test") throw new Error("Test telemetry provider is test-only"); }
  telemetry(input: Omit<TrustedTelemetry, "source" | "provider">) { return ingestTelemetry({ ...input, source: "TEST", provider: this.provider }); }
  heartbeat(input: Omit<Heartbeat, "source" | "provider">) { return ingestHeartbeat({ ...input, source: "TEST", provider: this.provider }); }
  eventId() { return randomUUID(); }
}

export async function evaluateStaleDevices(now = new Date()) {
  const cutoff = new Date(now.getTime() - HEALTH_STALE_MS);
  const devices = await prisma.device.findMany({ where: { isArchived: false, healthStatus: { in: ["ONLINE", "DEGRADED"] }, OR: [{ lastSeenAt: { lt: cutoff } }, { lastSeenAt: null, lastTelemetryAt: { lt: cutoff } }] }, select: { id: true } });
  for (const device of devices) await notifyHealth(device.id, "OFFLINE", `No trusted provider activity for ${HEALTH_STALE_MS / 60_000} minutes`);
  return devices.length;
}

function localDate(timestamp: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(timestamp);
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export async function aggregateEnergyDay(deviceId: string, date: Date) {
  const device = await prisma.device.findUniqueOrThrow({ where: { id: deviceId }, select: { id: true, homeId: true, home: { select: { timezone: true } } } });
  const dateKey = localDate(date, device.home.timezone);
  const samples = await prisma.deviceTelemetry.findMany({ where: { deviceId, metric: { in: ["ENERGY_WH", "POWER_WATTS"] } }, orderBy: { recordedAt: "asc" } });
  const daySamples = samples.filter((sample) => localDate(sample.recordedAt, device.home.timezone) === dateKey);
  const energy = daySamples.filter((s) => s.metric === "ENERGY_WH");
  const power = daySamples.filter((s) => s.metric === "POWER_WATTS");
  const measuredWh = energy.length ? energy.reduce((sum, sample) => sum + sample.value, 0) : null;
  let estimatedWh: number | null = null;
  if (!energy.length && power.length > 1) {
    estimatedWh = 0;
    for (let index = 1; index < power.length; index++) { const hours = Math.min((power[index].recordedAt.getTime() - power[index - 1].recordedAt.getTime()) / 3_600_000, 1); estimatedWh += ((power[index - 1].value + power[index].value) / 2) * Math.max(hours, 0); }
  }
  const peakPowerWatts = power.length ? Math.max(...power.map((sample) => sample.value)) : null;
  const localDateUtc = new Date(`${dateKey}T00:00:00.000Z`);
  return prisma.deviceEnergyDaily.upsert({ where: { deviceId_localDate: { deviceId, localDate: localDateUtc } }, create: { deviceId, homeId: device.homeId, localDate: localDateUtc, timezone: device.home.timezone, measuredWh, estimatedWh, peakPowerWatts, sampleCount: daySamples.length }, update: { measuredWh, estimatedWh, peakPowerWatts, sampleCount: daySamples.length, timezone: device.home.timezone, calculatedAt: new Date() } });
}

export async function aggregateEnergy(now = new Date()) {
  const devices = await prisma.deviceTelemetry.findMany({ where: { metric: { in: ["ENERGY_WH", "POWER_WATTS"] } }, distinct: ["deviceId"], select: { deviceId: true } });
  return Promise.all(devices.map(({ deviceId }) => aggregateEnergyDay(deviceId, now)));
}

export async function retainTelemetry(now = new Date(), batchSize = 1000) {
  const cutoff = new Date(now.getTime() - RAW_RETENTION_DAYS * 86_400_000);
  const rows = await prisma.deviceTelemetry.findMany({ where: { recordedAt: { lt: cutoff } }, select: { id: true }, take: Math.min(Math.max(batchSize, 1), 5000) });
  if (rows.length) await prisma.deviceTelemetry.deleteMany({ where: { id: { in: rows.map(({ id }) => id) } } });
  return rows.length;
}
