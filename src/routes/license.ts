import { Router } from "express";
import { z } from "zod";
import { mapUnknownError, toFailureResponse } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { activateLicense, deactivateLicense, validateLicense } from "../services/lemonSqueezy.js";

const activateSchema = z.object({
  license_key: z.string().min(1),
  machine_fingerprint: z.string().min(1)
});

const validateSchema = z.object({
  license_key: z.string().min(1),
  machine_fingerprint: z.string().min(1),
  instance_id: z.string().min(1).optional()
});

const deactivateSchema = z.object({
  license_key: z.string().min(1),
  machine_fingerprint: z.string().min(1),
  instance_id: z.string().min(1).optional()
});

export const licenseRouter = Router();

licenseRouter.post("/activate", async (req, res) => {
  try {
    const input = activateSchema.parse(req.body);
    const normalized = await activateLicense(input);
    res.status(200).json(normalized);
  } catch (error) {
    const mapped = mapUnknownError(error);
    logger.warn("License activation failed", { code: mapped.code });
    res.status(mapped.statusCode).json(toFailureResponse(mapped));
  }
});

licenseRouter.post("/validate", async (req, res) => {
  try {
    const input = validateSchema.parse(req.body);
    const normalized = await validateLicense(input);
    res.status(200).json(normalized);
  } catch (error) {
    const mapped = mapUnknownError(error);
    logger.warn("License validation failed", { code: mapped.code });
    res.status(mapped.statusCode).json(toFailureResponse(mapped));
  }
});

licenseRouter.post("/deactivate", async (req, res) => {
  try {
    const input = deactivateSchema.parse(req.body);
    const normalized = await deactivateLicense(input);
    res.status(200).json(normalized);
  } catch (error) {
    const mapped = mapUnknownError(error);
    logger.warn("License deactivation failed", { code: mapped.code });
    res.status(mapped.statusCode).json(toFailureResponse(mapped));
  }
});

licenseRouter.use((_req, res) => {
  res.status(404).json({ message: "Unknown license endpoint" });
});

