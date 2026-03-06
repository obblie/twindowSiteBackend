import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("production"),
    APP_ENV: z.string().optional(),
    PORT: z.coerce.number().int().positive().default(10000),
    LEMON_SQUEEZY_API_KEY: z.string().min(1),
    LEMON_API_BASE_URL: z.string().url().default("https://api.lemonsqueezy.com/v1"),
    LEMON_SQUEEZY_WEBHOOK_SIGNING_SECRET: z.string().min(1).optional(),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    CORS_ORIGIN: z.string().optional()
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  throw new Error(`Invalid environment configuration: ${details}`);
}

const corsOrigins = parsed.data.CORS_ORIGIN
  ? parsed.data.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
  : [];

export const env = {
  ...parsed.data,
  CORS_ORIGINS: corsOrigins
};
