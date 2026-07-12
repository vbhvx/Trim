import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "./auth/session";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId: string;
    timestamp: string;
    page?: number;
    limit?: number;
    total?: number;
  };
}

export function jsonSuccess<T>(data: T, meta?: ApiResponse["meta"], status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        ...meta,
      },
    },
    { status }
  );
}

export function jsonError(
  message: string,
  statusCode = 400,
  code = "BAD_REQUEST",
  details?: unknown
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
      meta: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    },
    { status: statusCode }
  );
}

export function handleApiError(err: unknown) {
  console.error("API Error:", err);

  if (err instanceof AuthError) {
    return jsonError(err.message, err.statusCode, err.code);
  }

  if (err instanceof ZodError) {
    return jsonError(
      "Validation failed",
      400,
      "VALIDATION_ERROR",
      err.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      }))
    );
  }

  if (err instanceof Error) {
    if (err.message.includes("Access Denied")) {
      return jsonError(err.message, 403, "FORBIDDEN");
    }
    return jsonError(err.message, 500, "INTERNAL_SERVER_ERROR");
  }

  return jsonError("An unexpected error occurred", 500, "INTERNAL_SERVER_ERROR");
}

