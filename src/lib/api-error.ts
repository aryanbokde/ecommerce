import type { AxiosError } from "axios";

export enum ErrorCode {
  UNAUTHORIZED    = "UNAUTHORIZED",
  FORBIDDEN       = "FORBIDDEN",
  NOT_FOUND       = "NOT_FOUND",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  SERVER_ERROR    = "SERVER_ERROR",
}

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function parseApiError(error: unknown): AppError {
  // AxiosError
  if (isAxiosError(error)) {
    const status = error.response?.status ?? 500;
    const message =
      (error.response?.data as Record<string, string>)?.message ??
      error.message ??
      "An unexpected error occurred";
    return new AppError(message, statusCodeToErrorCode(status), status);
  }

  // fetch Response error (thrown manually: throw response)
  if (error instanceof Response) {
    return new AppError(
      error.statusText || "Request failed",
      statusCodeToErrorCode(error.status),
      error.status
    );
  }

  // Native Error
  if (error instanceof Error) {
    return new AppError(error.message, ErrorCode.SERVER_ERROR, 500);
  }

  return new AppError("An unexpected error occurred", ErrorCode.SERVER_ERROR, 500);
}

function isAxiosError(error: unknown): error is AxiosError {
  return typeof error === "object" && error !== null && (error as AxiosError).isAxiosError === true;
}

function statusCodeToErrorCode(status: number): ErrorCode {
  switch (status) {
    case 401: return ErrorCode.UNAUTHORIZED;
    case 403: return ErrorCode.FORBIDDEN;
    case 404: return ErrorCode.NOT_FOUND;
    case 422: return ErrorCode.VALIDATION_ERROR;
    default:  return ErrorCode.SERVER_ERROR;
  }
}
