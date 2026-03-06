import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { mapUnknownError, toFailureResponse } from "./lib/errors.js";
import { logger } from "./lib/logger.js";
import { licenseRouter } from "./routes/license.js";
import { webhookRouter } from "./routes/webhooks.js";

export const app = express();

const corsMiddleware = cors({
  origin(origin, callback) {
    if (!env.CORS_ORIGINS.length) {
      return callback(null, true);
    }

    if (!origin || env.CORS_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("CORS origin denied"));
  },
  credentials: true
});

app.disable("x-powered-by");
app.use(corsMiddleware);
app.use("/api/webhooks/lemon-squeezy", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "128kb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/api/license", licenseRouter);
app.use("/api/webhooks", webhookRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const mapped = mapUnknownError(err);
  logger.error("Unhandled application error", {
    code: mapped.code
  });
  res.status(mapped.statusCode).json(toFailureResponse(mapped));
});

