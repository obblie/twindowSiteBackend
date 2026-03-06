import { Router } from "express";
import { AppError, mapUnknownError, toFailureResponse } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { verifyWebhookSignature } from "../services/lemonSqueezy.js";

export const webhookRouter = Router();

webhookRouter.post("/lemon-squeezy", (req, res) => {
  try {
    const signature = req.header("X-Signature") ?? req.header("x-signature");
    const rawBody = req.body instanceof Buffer ? req.body.toString("utf8") : "";

    if (!verifyWebhookSignature(rawBody, signature)) {
      throw new AppError("BAD_REQUEST", "Invalid webhook signature", 401);
    }

    logger.info("Lemon webhook received", {
      source: "lemon_squeezy"
    });
    res.status(200).json({ ok: true });
  } catch (error) {
    const mapped = mapUnknownError(error);
    logger.warn("Webhook rejected", {
      code: mapped.code
    });
    res.status(mapped.statusCode).json(toFailureResponse(mapped));
  }
});

