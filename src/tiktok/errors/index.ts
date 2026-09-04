export type TikTokErrorCode =
  | "TIKTOK_API_ERROR"
  | "TIKTOK_AUTHENTICATION_ERROR"
  | "TIKTOK_AUTHORIZATION_ERROR"
  | "TIKTOK_PERMISSION_ERROR"
  | "TIKTOK_RATE_LIMIT_ERROR"
  | "TIKTOK_VALIDATION_ERROR"
  | "TIKTOK_NOT_FOUND_ERROR"
  | "TIKTOK_REPORT_ERROR";

export class TikTokApiError extends Error {
  readonly code: TikTokErrorCode;
  readonly status?: number;
  readonly tiktokCode?: number;
  readonly requestId?: string;

  constructor(
    message: string,
    options?: {
      code?: TikTokErrorCode;
      status?: number;
      tiktokCode?: number;
      requestId?: string;
      cause?: unknown;
    },
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "TikTokApiError";
    this.code = options?.code ?? "TIKTOK_API_ERROR";
    this.status = options?.status;
    this.tiktokCode = options?.tiktokCode;
    this.requestId = options?.requestId;
  }
}

export class TikTokAuthenticationError extends TikTokApiError {
  constructor(message: string, options?: ConstructorParameters<typeof TikTokApiError>[1]) {
    super(message, { ...options, code: "TIKTOK_AUTHENTICATION_ERROR" });
    this.name = "TikTokAuthenticationError";
  }
}

export class TikTokAuthorizationError extends TikTokApiError {
  constructor(message: string, options?: ConstructorParameters<typeof TikTokApiError>[1]) {
    super(message, { ...options, code: "TIKTOK_AUTHORIZATION_ERROR" });
    this.name = "TikTokAuthorizationError";
  }
}

export class TikTokPermissionError extends TikTokApiError {
  constructor(message: string, options?: ConstructorParameters<typeof TikTokApiError>[1]) {
    super(message, { ...options, code: "TIKTOK_PERMISSION_ERROR" });
    this.name = "TikTokPermissionError";
  }
}

export class TikTokRateLimitError extends TikTokApiError {
  constructor(message: string, options?: ConstructorParameters<typeof TikTokApiError>[1]) {
    super(message, { ...options, code: "TIKTOK_RATE_LIMIT_ERROR" });
    this.name = "TikTokRateLimitError";
  }
}

export class TikTokValidationError extends TikTokApiError {
  constructor(message: string, options?: ConstructorParameters<typeof TikTokApiError>[1]) {
    super(message, { ...options, code: "TIKTOK_VALIDATION_ERROR" });
    this.name = "TikTokValidationError";
  }
}

export class TikTokNotFoundError extends TikTokApiError {
  constructor(message: string, options?: ConstructorParameters<typeof TikTokApiError>[1]) {
    super(message, { ...options, code: "TIKTOK_NOT_FOUND_ERROR" });
    this.name = "TikTokNotFoundError";
  }
}

export class TikTokReportError extends TikTokApiError {
  constructor(message: string, options?: ConstructorParameters<typeof TikTokApiError>[1]) {
    super(message, { ...options, code: "TIKTOK_REPORT_ERROR" });
    this.name = "TikTokReportError";
  }
}

export function mapTikTokError(params: {
  httpStatus?: number;
  tiktokCode?: number;
  message?: string;
  requestId?: string;
}): TikTokApiError {
  const message = params.message || "TikTok Marketing API request failed.";
  const options = {
    status: params.httpStatus,
    tiktokCode: params.tiktokCode,
    requestId: params.requestId,
  };

  if (params.httpStatus === 429 || params.tiktokCode === 40100 || params.tiktokCode === 40101) {
    return new TikTokRateLimitError(
      "TikTok rate-limited the request. Wait briefly and retry with a smaller page or date range.",
      options,
    );
  }
  if (params.httpStatus === 401 || params.tiktokCode === 40001 || params.tiktokCode === 40105) {
    return new TikTokAuthenticationError(
      "TikTok rejected the request because the configured OAuth connection is missing, expired, or revoked. Reconnect the advertiser.",
      options,
    );
  }
  if (params.httpStatus === 403 || params.tiktokCode === 40002) {
    return new TikTokPermissionError(
      "TikTok rejected the request because the configured OAuth connection does not have permission to access the requested resource.",
      options,
    );
  }
  if (params.httpStatus === 404 || params.tiktokCode === 40003) {
    return new TikTokNotFoundError("TikTok could not find the requested advertiser, campaign, ad group, or ad.", options);
  }
  if (params.httpStatus === 400 || (params.tiktokCode !== undefined && params.tiktokCode >= 40000 && params.tiktokCode < 40100)) {
    return new TikTokValidationError(message, options);
  }
  return new TikTokApiError(message, options);
}

export function toToolErrorText(error: unknown): string {
  if (error instanceof TikTokApiError) {
    return JSON.stringify(
      {
        error: error.code,
        message: error.message,
        tiktok_code: error.tiktokCode,
        request_id: error.requestId,
      },
      null,
      2,
    );
  }
  if (error instanceof Error) {
    return JSON.stringify({ error: "INTERNAL_ERROR", message: error.message }, null, 2);
  }
  return JSON.stringify({ error: "INTERNAL_ERROR", message: "Unexpected error." }, null, 2);
}
