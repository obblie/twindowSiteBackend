import { ZodError } from "zod";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(code: string, message: string, statusCode = 500) {
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
    return new AppError("BAD_REQUEST", "Missing or invalid request fields", 400);
  }

  if (error instanceof Error && error.message === "CORS origin denied") {
    return new AppError("BAD_REQUEST", "Origin not allowed", 400);
  }

  return new AppError("INTERNAL_ERROR", "Internal server error", 500);
}

export function toFailureResponse(error: AppError): { message: string } {
  return {
    message: error.message
  };
}
