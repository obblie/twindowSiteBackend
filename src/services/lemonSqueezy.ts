import crypto from "node:crypto";
import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";
import type { LicenseSnapshot, LicenseStatus } from "../types/license.js";

const LEMON_LICENSE_API_BASE = "https://api.lemonsqueezy.com/v1/licenses";

type LemonLicenseAction = "activate" | "validate" | "deactivate";

type LemonPayload = {
  license_key: string;
  instance_name?: string;
  instance_id?: string;
  store_id: string;
  product_id?: string;
  variant_id?: string;
};

type LemonRawResponse = {
  activated?: boolean;
  valid?: boolean;
  deactivated?: boolean;
  error?: string | null;
  instance?: {
    id?: string | number | null;
  } | null;
  meta?: {
    test_mode?: boolean;
  };
  [key: string]: unknown;
};

function computeNextCheckAt(): string {
  return new Date(Date.now() + env.LICENSE_VALIDATION_INTERVAL_SECONDS * 1000).toISOString();
}

function deriveStatus(action: LemonLicenseAction, raw: LemonRawResponse): LicenseStatus {
  if (action === "deactivate") {
    return raw.deactivated ? "inactive" : "invalid";
  }

  if (raw.valid === true || raw.activated === true) {
    return "active";
  }

  return "invalid";
}

function mapErrorCode(action: LemonLicenseAction, upstreamError?: string | null): AppError {
  if (!upstreamError) {
    if (action === "activate") {
      return new AppError("ACTIVATION_FAILED", "License activation failed", 422);
    }
    return new AppError("INVALID_LICENSE", "License is invalid", 422);
  }

  const normalized = upstreamError.toLowerCase();
  if (normalized.includes("invalid") || normalized.includes("not found")) {
    return new AppError("INVALID_LICENSE", "License is invalid", 422);
  }

  if (action === "activate") {
    return new AppError("ACTIVATION_FAILED", "License activation failed", 422);
  }

  return new AppError("UPSTREAM_UNAVAILABLE", "License provider unavailable", 503);
}

function sanitizeInstanceId(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
}

async function lemonRequest(action: LemonLicenseAction, payload: LemonPayload): Promise<LemonRawResponse> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      body.set(key, String(value));
    }
  });

  let response: Response;
  try {
    response = await fetch(`${LEMON_LICENSE_API_BASE}/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json"
      },
      body
    });
  } catch (_error) {
    throw new AppError("UPSTREAM_UNAVAILABLE", "License provider unavailable", 503);
  }

  let json: LemonRawResponse;
  try {
    json = (await response.json()) as LemonRawResponse;
  } catch (_error) {
    throw new AppError("UPSTREAM_UNAVAILABLE", "License provider unavailable", 503);
  }

  if (!response.ok) {
    throw mapErrorCode(action, json.error);
  }

  if (json.error) {
    throw mapErrorCode(action, json.error);
  }

  return json;
}

function toLicenseSnapshot(action: LemonLicenseAction, raw: LemonRawResponse): LicenseSnapshot {
  const status = deriveStatus(action, raw);
  return {
    status,
    instanceId: sanitizeInstanceId(raw.instance?.id),
    entitlements: {
      premium: status === "active"
    },
    nextCheckAt: computeNextCheckAt()
  };
}

function basePayload(licenseKey: string): Pick<LemonPayload, "license_key" | "store_id" | "product_id" | "variant_id"> {
  return {
    license_key: licenseKey,
    store_id: env.LEMON_SQUEEZY_STORE_ID,
    product_id: env.LEMON_SQUEEZY_PRODUCT_ID,
    variant_id: env.LEMON_SQUEEZY_VARIANT_ID
  };
}

export async function activateLicense(input: { licenseKey: string; instanceName: string }): Promise<LicenseSnapshot> {
  const raw = await lemonRequest("activate", {
    ...basePayload(input.licenseKey),
    instance_name: input.instanceName
  });
  return toLicenseSnapshot("activate", raw);
}

export async function validateLicense(input: { licenseKey: string; instanceId?: string }): Promise<LicenseSnapshot> {
  const raw = await lemonRequest("validate", {
    ...basePayload(input.licenseKey),
    instance_id: input.instanceId
  });
  return toLicenseSnapshot("validate", raw);
}

export async function deactivateLicense(input: { licenseKey: string; instanceId: string }): Promise<LicenseSnapshot> {
  const raw = await lemonRequest("deactivate", {
    ...basePayload(input.licenseKey),
    instance_id: input.instanceId
  });
  return toLicenseSnapshot("deactivate", raw);
}

export function verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
  const secret = env.LEMON_SQUEEZY_WEBHOOK_SIGNING_SECRET;
  if (!secret || !signature) {
    return false;
  }

  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const expected = Buffer.from(digest, "utf8");
  const received = Buffer.from(signature, "utf8");

  if (expected.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, received);
}

