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
