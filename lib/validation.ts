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
