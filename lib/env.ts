import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  SESSION_SECRET: z.string().min(32),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export function getEnv() { return schema.parse(process.env); }

export const bootstrapEnvSchema = z.object({
  SUPER_ADMIN_EMAIL: z.string().email(),
  SUPER_ADMIN_PASSWORD: z.string().min(12),
  SUPER_ADMIN_NAME: z.string().trim().min(2).max(100),
});
