import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
}).strict();
export const registerSchema = credentialsSchema.extend({ name: z.string().trim().min(2).max(100) }).strict();
export const createAdminSchema = registerSchema.extend({ isDefaultAdmin: z.boolean().optional().default(false) }).strict();
export const createHomeOwnerSchema = registerSchema.strict();
export const updateAdminSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  isActive: z.boolean().optional(),
  isDefaultAdmin: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "At least one change is required");
export function normalizeEmail(email: string) { return email.trim().toLowerCase(); }

const timezone = z.string().trim().min(1).max(100).refine((value) => {
  try { Intl.DateTimeFormat(undefined, { timeZone: value }); return true; } catch { return false; }
}, "Invalid IANA timezone");
const homeName = z.string().trim().min(2).max(100);
const roomName = z.string().trim().min(1).max(100);
export const createHomeSchema = z.object({ targetHomeOwnerId: z.string().uuid(), name: homeName, timezone }).strict();
export const updateHomeSchema = z.object({ name: homeName.optional(), timezone: timezone.optional(), isArchived: z.boolean().optional() }).strict().refine((value) => Object.keys(value).length > 0, "At least one change is required");
export const createRoomSchema = z.object({ name: roomName }).strict();
export const updateRoomSchema = z.object({ name: roomName }).strict();
export const addHomeMemberSchema = z.object({ userId: z.string().uuid() }).strict();
export const createHomeUserSchema = registerSchema.strict();
export function normalizeRoomName(name: string) { return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US"); }

export const capabilitySchema = z.enum(["power", "brightness", "speed", "contact", "battery", "temperature", "humidity"]);
const stateValueSchemas = {
  power: z.boolean(), brightness: z.number().int().min(0).max(100), speed: z.number().int().min(0).max(10),
  contact: z.enum(["open", "closed"]), battery: z.number().min(0).max(100), temperature: z.number().min(-100).max(150), humidity: z.number().min(0).max(100),
} as const;
const deviceBaseSchema = z.object({
  homeId: z.string().uuid(), roomId: z.string().uuid().nullable().optional(), name: z.string().trim().min(2).max(100),
  deviceType: z.enum(["LIGHT", "SWITCH", "FAN", "SENSOR", "OTHER"]), protocol: z.enum(["WIFI", "ZIGBEE", "TUYA"]),
  manufacturer: z.string().trim().min(1).max(100).nullable().optional(), model: z.string().trim().min(1).max(100).nullable().optional(), externalDeviceId: z.string().trim().min(1).max(255).nullable().optional(),
  capabilities: z.array(capabilitySchema).min(1).max(7).refine((v) => new Set(v).size === v.length, "Duplicate capability"), state: z.record(z.string(), z.unknown()),
}).strict();
export const createDeviceSchema = deviceBaseSchema.superRefine((value, ctx) => { for (const [key, state] of Object.entries(value.state)) { if (!value.capabilities.includes(key as never)) ctx.addIssue({ code: "custom", path: ["state", key], message: "State capability is not declared" }); else { const parsed = stateValueSchemas[key as keyof typeof stateValueSchemas].safeParse(state); if (!parsed.success) ctx.addIssue({ code: "custom", path: ["state", key], message: "Invalid capability state" }); } } });
export const updateDeviceSchema = z.object({ name: z.string().trim().min(2).max(100).optional(), roomId: z.string().uuid().nullable().optional(), deviceType: z.enum(["LIGHT", "SWITCH", "FAN", "SENSOR", "OTHER"]).optional(), manufacturer: z.string().trim().min(1).max(100).nullable().optional(), model: z.string().trim().min(1).max(100).nullable().optional(), externalDeviceId: z.string().trim().min(1).max(255).nullable().optional(), isArchived: z.boolean().optional() }).strict().refine((v) => Object.keys(v).length > 0, "At least one change is required");
export const deviceCommandSchema = z.discriminatedUnion("command", [
  z.object({ command: z.literal("setPower"), value: z.boolean() }).strict(), z.object({ command: z.literal("setBrightness"), value: z.number().int().min(0).max(100) }).strict(), z.object({ command: z.literal("setSpeed"), value: z.number().int().min(0).max(10) }).strict(),
]);
export const createOnboardingSessionSchema = z.object({ roomId: z.string().uuid().nullable().optional(), onboardingType: z.enum(["WIFI_BLE", "ZIGBEE_GATEWAY", "TUYA", "GATEWAY"]) }).strict();
export const completeOnboardingSchema = z.object({ ssid: z.string().trim().min(1).max(32).optional(), wifiPassword: z.string().min(8).max(63).optional() }).strict();
export const createGatewaySchema = z.object({ homeId: z.string().uuid(), name: z.string().trim().min(2).max(100), gatewayType: z.enum(["ZIGBEE", "TUYA", "MULTIPROTOCOL"]), connectionType: z.enum(["WIFI", "ETHERNET"]), manufacturer: z.string().trim().min(1).max(100).nullable().optional(), model: z.string().trim().min(1).max(100).nullable().optional(), externalGatewayId: z.string().trim().min(1).max(255).nullable().optional() }).strict();
export const updateGatewaySchema = z.object({ name: z.string().trim().min(2).max(100).optional(), isArchived: z.boolean().optional() }).strict().refine((v) => Object.keys(v).length > 0, "At least one change is required");
