import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("production"),
    PORT: z.coerce.number().int().positive().default(10000),
    LEMON_SQUEEZY_STORE_ID: z.string().min(1),
    LEMON_SQUEEZY_PRODUCT_ID: z.string().min(1).optional(),
    LEMON_SQUEEZY_VARIANT_ID: z.string().min(1).optional(),
    LEMON_SQUEEZY_API_KEY: z.string().min(1).optional(),
    LEMON_SQUEEZY_WEBHOOK_SIGNING_SECRET: z.string().min(1).optional(),
    LICENSE_VALIDATION_INTERVAL_SECONDS: z.coerce.number().int().positive().default(86400),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    CORS_ORIGIN: z.string().optional()
  })
  .superRefine((value, ctx) => {
    if (!value.LEMON_SQUEEZY_PRODUCT_ID && !value.LEMON_SQUEEZY_VARIANT_ID) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["LEMON_SQUEEZY_PRODUCT_ID"],
        message: "Either LEMON_SQUEEZY_PRODUCT_ID or LEMON_SQUEEZY_VARIANT_ID is required"
      });
    }
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

