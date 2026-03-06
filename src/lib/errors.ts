import { ZodError } from "zod";
import type { ApiFailure } from "../types/license.js";

type ErrorCode = ApiFailure["error"]["code"];

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string, statusCode = 500) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function mapUnknownError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new AppError("BAD_REQUEST", "Invalid request payload", 400);
  }

  if (error instanceof Error && error.message === "CORS origin denied") {
    return new AppError("BAD_REQUEST", "Origin not allowed", 403);
  }

  return new AppError("UPSTREAM_UNAVAILABLE", "Service temporarily unavailable", 503);
}

export function toFailureResponse(error: AppError): ApiFailure {
  return {
    ok: false,
    license: null,
    error: {
      code: error.code,
      message: error.message
    }
  };
}
