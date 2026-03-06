import crypto from "node:crypto";
import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";
import type { LicenseDeactivateResponse, LicenseStatusResponse } from "../types/license.js";

type LemonLicenseAction = "activate" | "validate" | "deactivate";

type LemonPayload = {
  license_key: string;
  instance_name?: string;
  instance_id?: string;
};

type LemonRawResponse = {
  activated?: boolean;
  valid?: boolean;
  deactivated?: boolean;
  error?: string | null;
  message?: string | null;
  instance?: {
    id?: string | number | null;
  } | null;
  instance_id?: string | number | null;
  license_key?: {
    expires_at?: string | null;
  } | null;
  expires_at?: string | null;
  [key: string]: unknown;
};

type LemonCallResult =
  | {
      kind: "ok";
      raw: LemonRawResponse;
    }
  | {
      kind: "invalid";
      message: string;
    };

function sanitizeInstanceId(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
}

function safeIsoOrNull(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function extractExpiresAt(raw: LemonRawResponse): string | null {
  return safeIsoOrNull(raw.license_key?.expires_at ?? raw.expires_at ?? null);
}

function normalizeInvalidLicenseError(text: string): boolean {
  const value = text.toLowerCase();
  return (
    value.includes("invalid") ||
    value.includes("not found") ||
    value.includes("unable to find") ||
    value.includes("does not exist")
  );
}

function extractUpstreamMessage(json: unknown): string | null {
  if (!json || typeof json !== "object") {
    return null;
  }

  const data = json as Record<string, unknown>;
  if (typeof data.error === "string" && data.error.trim()) {
    return data.error.trim();
  }
  if (typeof data.message === "string" && data.message.trim()) {
    return data.message.trim();
  }

  return null;
}

async function lemonRequest(action: LemonLicenseAction, payload: LemonPayload): Promise<LemonCallResult> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      body.set(key, String(value));
    }
  });

  let response: Response;
  try {
    response = await fetch(`${env.LEMON_API_BASE_URL}/licenses/${action}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.LEMON_SQUEEZY_API_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json"
      },
      body
    });
  } catch (_error) {
    throw new AppError("UPSTREAM_UNAVAILABLE", "License provider unavailable", 502);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (_error) {
    throw new AppError("UPSTREAM_UNAVAILABLE", "License provider unavailable", 502);
  }

  const upstreamMessage = extractUpstreamMessage(json);
  if (!response.ok || upstreamMessage) {
    if (upstreamMessage && normalizeInvalidLicenseError(upstreamMessage)) {
      return { kind: "invalid", message: "License is invalid" };
    }
    throw new AppError("UPSTREAM_UNAVAILABLE", "License provider unavailable", 502);
  }

  return { kind: "ok", raw: json as LemonRawResponse };
}

function toStatusResponse(result: LemonCallResult, action: "activate" | "validate"): LicenseStatusResponse {
  if (result.kind === "invalid") {
    return {
      active: false,
      tier: "free",
      instanceID: null,
      expiresAt: null,
      message: result.message
    };
  }

  const active = action === "activate" ? result.raw.activated === true : result.raw.valid === true;
  return {
    active,
    tier: active ? "premium" : "free",
    instanceID: sanitizeInstanceId(result.raw.instance?.id ?? result.raw.instance_id ?? null),
    expiresAt: extractExpiresAt(result.raw),
    message: active ? null : "License is not active"
  };
}

function toDeactivateResponse(result: LemonCallResult): LicenseDeactivateResponse {
  if (result.kind === "invalid") {
    return {
      deactivated: false,
      message: result.message
    };
  }

  const deactivated = result.raw.deactivated === true;
  return {
    deactivated,
    message: deactivated ? null : "License was not deactivated"
  };
}

export async function activateLicense(input: {
  license_key: string;
  machine_fingerprint: string;
}): Promise<LicenseStatusResponse> {
  const result = await lemonRequest("activate", {
    license_key: input.license_key,
    instance_name: input.machine_fingerprint
  });
  return toStatusResponse(result, "activate");
}

export async function validateLicense(input: {
  license_key: string;
  machine_fingerprint: string;
  instance_id?: string;
}): Promise<LicenseStatusResponse> {
  const result = await lemonRequest("validate", {
    license_key: input.license_key,
    instance_name: input.machine_fingerprint,
    instance_id: input.instance_id
  });
  return toStatusResponse(result, "validate");
}

export async function deactivateLicense(input: {
  license_key: string;
  machine_fingerprint: string;
  instance_id?: string;
}): Promise<LicenseDeactivateResponse> {
  const result = await lemonRequest("deactivate", {
    license_key: input.license_key,
    instance_name: input.machine_fingerprint,
    instance_id: input.instance_id
  });
  return toDeactivateResponse(result);
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

