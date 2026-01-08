import { NextResponse } from "next/server";

/**
 * Standardized error response types
 */
export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR"
  | "RATE_LIMIT_EXCEEDED"
  | "CONFLICT";

/**
 * Standardized API error response
 */
export interface ApiErrorResponse {
  error: string;
  code?: ApiErrorCode;
  details?: Record<string, unknown>;
}

/**
 * HTTP status codes mapped to error codes
 */
const STATUS_CODE_MAP: Record<number, ApiErrorCode> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  429: "RATE_LIMIT_EXCEEDED",
  500: "INTERNAL_ERROR",
};

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  code?: ApiErrorCode,
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  const errorCode = code || STATUS_CODE_MAP[status] || "INTERNAL_ERROR";

  return NextResponse.json(
    {
      error: message,
      code: errorCode,
      ...(details && { details }),
    },
    { status }
  );
}

/**
 * Common error response helpers
 */
export const ApiError = {
  unauthorized: (message: string = "Unauthorized") =>
    createErrorResponse(message, 401, "UNAUTHORIZED"),

  forbidden: (message: string = "Forbidden") =>
    createErrorResponse(message, 403, "FORBIDDEN"),

  notFound: (message: string = "Resource not found") =>
    createErrorResponse(message, 404, "NOT_FOUND"),

  badRequest: (message: string = "Bad request", details?: Record<string, unknown>) =>
    createErrorResponse(message, 400, "BAD_REQUEST", details),

  validationError: (message: string = "Validation failed", details?: Record<string, unknown>) =>
    createErrorResponse(message, 400, "VALIDATION_ERROR", details),

  conflict: (message: string = "Conflict") =>
    createErrorResponse(message, 409, "CONFLICT"),

  rateLimit: (message: string = "Rate limit exceeded") =>
    createErrorResponse(message, 429, "RATE_LIMIT_EXCEEDED"),

  internal: (message: string = "Internal server error", details?: Record<string, unknown>) =>
    createErrorResponse(message, 500, "INTERNAL_ERROR", details),

  fromError: (error: unknown, defaultMessage: string = "An error occurred"): NextResponse<ApiErrorResponse> => {
    if (error instanceof Error) {
      // Don't expose internal error messages in production
      const message = process.env.NODE_ENV === "production" 
        ? defaultMessage 
        : error.message || defaultMessage;
      
      return createErrorResponse(message, 500, "INTERNAL_ERROR");
    }
    
    return createErrorResponse(defaultMessage, 500, "INTERNAL_ERROR");
  },
};

