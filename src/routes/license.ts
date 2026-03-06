import { Router } from "express";
import { z } from "zod";
import { mapUnknownError, toFailureResponse } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { activateLicense, deactivateLicense, validateLicense } from "../services/lemonSqueezy.js";
import type { ApiResponse, LicenseSnapshot } from "../types/license.js";

const activateSchema = z.object({
  licenseKey: z.string().min(1),
  instanceName: z.string().min(1).max(120)
});

const validateSchema = z.object({
  licenseKey: z.string().min(1),
  instanceId: z.string().min(1).optional()
});

const deactivateSchema = z.object({
  licenseKey: z.string().min(1),
  instanceId: z.string().min(1)
});

function successResponse(license: LicenseSnapshot): ApiResponse {
  return {
    ok: true,
    license,
    error: null
  };
}

export const licenseRouter = Router();

licenseRouter.post("/activate", async (req, res) => {
  try {
    const input = activateSchema.parse(req.body);
    const license = await activateLicense(input);
    res.status(200).json(successResponse(license));
  } catch (error) {
    const mapped = mapUnknownError(error);
    logger.warn("License activation failed", {
      code: mapped.code
    });
    res.status(mapped.statusCode).json(toFailureResponse(mapped));
  }
});

licenseRouter.post("/validate", async (req, res) => {
  try {
    const input = validateSchema.parse(req.body);
    const license = await validateLicense(input);
    res.status(200).json(successResponse(license));
  } catch (error) {
    const mapped = mapUnknownError(error);
    logger.warn("License validation failed", {
      code: mapped.code
    });
    res.status(mapped.statusCode).json(toFailureResponse(mapped));
  }
});

licenseRouter.post("/deactivate", async (req, res) => {
  try {
    const input = deactivateSchema.parse(req.body);
    const license = await deactivateLicense(input);
    res.status(200).json(successResponse(license));
  } catch (error) {
    const mapped = mapUnknownError(error);
    logger.warn("License deactivation failed", {
      code: mapped.code
    });
    res.status(mapped.statusCode).json(toFailureResponse(mapped));
  }
});

licenseRouter.use((_req, res) => {
  const err = {
    ok: false,
    license: null,
    error: {
      code: "BAD_REQUEST" as const,
      message: "Unknown license endpoint"
    }
  };
  res.status(404).json(err);
});
