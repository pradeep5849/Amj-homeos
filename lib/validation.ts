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
export const updateHomeSchema = z.object({ name: homeName.optional(), timezone: timezone.optional(), isArchived: z.boolean().optional(), latitude:z.number().min(-90).max(90).nullable().optional(),longitude:z.number().min(-180).max(180).nullable().optional() }).strict().refine((value) => Object.keys(value).length > 0, "At least one change is required");
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
export const completeOnboardingSchema = z.object({
  ssid: z.string().trim().min(1).max(32).optional(), wifiPassword: z.string().min(8).max(63).optional(),
  roomId: z.string().uuid().nullable().optional(), name: z.string().trim().min(2).max(100).optional(),
  deviceType: z.enum(["LIGHT", "SWITCH", "FAN", "SENSOR", "OTHER"]).optional(),
}).strict();
export const createGatewaySchema = z.object({ homeId: z.string().uuid(), name: z.string().trim().min(2).max(100), gatewayType: z.enum(["ZIGBEE", "TUYA", "MULTIPROTOCOL"]), connectionType: z.enum(["WIFI", "ETHERNET"]), manufacturer: z.string().trim().min(1).max(100).nullable().optional(), model: z.string().trim().min(1).max(100).nullable().optional(), externalGatewayId: z.string().trim().min(1).max(255).nullable().optional() }).strict();
export const updateGatewaySchema = z.object({ name: z.string().trim().min(2).max(100).optional(), isArchived: z.boolean().optional() }).strict().refine((v) => Object.keys(v).length > 0, "At least one change is required");

const stage5Name=z.string().trim().min(2).max(100), description=z.string().trim().max(500).nullable().optional();
export const createSceneSchema=z.object({name:stage5Name,description,isEnabled:z.boolean().optional()}).strict();
export const updateSceneSchema=z.object({name:stage5Name.optional(),description,isEnabled:z.boolean().optional(),isArchived:z.boolean().optional()}).strict().refine(v=>Object.keys(v).length>0,"At least one change is required");
export const logicalActionSchema=z.discriminatedUnion("command",[
 z.object({deviceId:z.string().uuid(),command:z.literal("setPower"),value:z.boolean(),sortOrder:z.number().int().min(0).max(1000)}).strict(),
 z.object({deviceId:z.string().uuid(),command:z.literal("setBrightness"),value:z.number().int().min(0).max(100),sortOrder:z.number().int().min(0).max(1000)}).strict(),
 z.object({deviceId:z.string().uuid(),command:z.literal("setSpeed"),value:z.number().int().min(0).max(10),sortOrder:z.number().int().min(0).max(1000)}).strict(),
]);
export const updateLogicalActionSchema=logicalActionSchema;
export const createAutomationSchema=z.object({name:stage5Name,description,isEnabled:z.boolean().optional()}).strict();
export const updateAutomationSchema=z.object({name:stage5Name.optional(),description,isEnabled:z.boolean().optional(),isArchived:z.boolean().optional()}).strict().refine(v=>Object.keys(v).length>0,"At least one change is required");
const capability=z.enum(["power","brightness","speed","contact","battery","temperature","humidity"]),operator=z.enum(["EQUALS","NOT_EQUALS","GREATER_THAN","GREATER_THAN_OR_EQUAL","LESS_THAN","LESS_THAN_OR_EQUAL"]);
export const automationTriggerSchema=z.discriminatedUnion("triggerType",[
 z.object({triggerType:z.literal("MANUAL")}).strict(),
 z.object({triggerType:z.literal("DEVICE_STATE"),deviceId:z.string().uuid(),capability,operator,value:z.union([z.boolean(),z.number(),z.enum(["open","closed"])])}).strict().superRefine((v,c)=>{const numeric=["brightness","speed","battery","temperature","humidity"].includes(v.capability);if(!numeric&&!['EQUALS','NOT_EQUALS'].includes(v.operator))c.addIssue({code:'custom',message:'Operator is incompatible with capability',path:['operator']});if(v.capability==='power'&&typeof v.value!=='boolean')c.addIssue({code:'custom',message:'Power requires boolean',path:['value']});if(v.capability==='contact'&&!['open','closed'].includes(String(v.value)))c.addIssue({code:'custom',message:'Contact requires open or closed',path:['value']});if(numeric&&typeof v.value!=='number')c.addIssue({code:'custom',message:'Numeric capability requires number',path:['value']})}),
 z.object({triggerType:z.enum(["PRESENCE_HOME","PRESENCE_AWAY"]),userId:z.string().uuid()}).strict(),
 z.object({triggerType:z.enum(["EVERYONE_AWAY","ANYONE_HOME"])}).strict(),
]);

const scheduleBase={isEnabled:z.boolean().optional(),offsetMinutes:z.number().int().min(-720).max(720).optional()};
export const createScheduleSchema=z.discriminatedUnion("scheduleType",[
 z.object({...scheduleBase,scheduleType:z.literal("ONCE"),runAt:z.coerce.date()}).strict(),
 z.object({...scheduleBase,scheduleType:z.literal("DAILY"),localTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)}).strict(),
 z.object({...scheduleBase,scheduleType:z.literal("WEEKLY"),localTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),daysOfWeek:z.array(z.number().int().min(0).max(6)).min(1).max(7).refine(v=>new Set(v).size===v.length)}).strict(),
 z.object({...scheduleBase,scheduleType:z.enum(["SUNRISE","SUNSET"])}).strict(),
]);
export const updateScheduleSchema=z.object({isEnabled:z.boolean().optional(),localTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),daysOfWeek:z.array(z.number().int().min(0).max(6)).optional(),offsetMinutes:z.number().int().min(-720).max(720).optional()}).strict().refine(v=>Object.keys(v).length>0);
export const createTimerSchema=z.union([
 z.object({targetType:z.literal("DEVICE_COMMAND"),deviceId:z.string().uuid(),runAt:z.coerce.date(),command:z.literal("setPower"),value:z.boolean()}).strict(),
 z.object({targetType:z.literal("DEVICE_COMMAND"),deviceId:z.string().uuid(),runAt:z.coerce.date(),command:z.literal("setBrightness"),value:z.number().int().min(0).max(100)}).strict(),
 z.object({targetType:z.literal("DEVICE_COMMAND"),deviceId:z.string().uuid(),runAt:z.coerce.date(),command:z.literal("setSpeed"),value:z.number().int().min(0).max(10)}).strict(),
 z.object({targetType:z.literal("SCENE"),sceneId:z.string().uuid(),runAt:z.coerce.date()}).strict(),
]);
export const notificationPreferenceSchema=z.object({inAppEnabled:z.boolean().optional(),deviceEventsEnabled:z.boolean().optional(),automationEventsEnabled:z.boolean().optional(),scheduleEventsEnabled:z.boolean().optional(),systemEventsEnabled:z.boolean().optional(),pushEnabled:z.boolean().optional(),presenceEventsEnabled:z.boolean().optional()}).strict().refine(v=>Object.keys(v).length>0);
export const geofenceSchema=z.object({name:z.string().trim().min(2).max(100),latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180),radiusMeters:z.number().int().min(50).max(2000),isEnabled:z.boolean().optional()}).strict();
export const mobileClientSchema=z.object({clientInstanceId:z.string().uuid(),platform:z.enum(["ANDROID","IOS","WEB"]),appVersion:z.string().trim().max(30).optional(),deviceLabel:z.string().trim().max(100).optional(),pushProvider:z.enum(["FCM","APNS","WEB_PUSH"]).optional(),pushToken:z.string().min(20).max(4096).optional()}).strict();
export const locationReportSchema=z.object({clientInstanceId:z.string().uuid(),eventId:z.string().uuid(),eventType:z.enum(["ENTER","EXIT","LOCATION_SAMPLE"]),timestamp:z.coerce.date(),latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180),accuracyMeters:z.number().min(0).max(10000)}).strict();
export const manualPresenceSchema=z.object({status:z.enum(["HOME","AWAY","UNKNOWN"])}).strict();
export const coordinatesSchema=z.object({latitude:z.number().min(-90).max(90).nullable(),longitude:z.number().min(-180).max(180).nullable()}).strict();
