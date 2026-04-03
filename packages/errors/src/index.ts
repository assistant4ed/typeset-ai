export enum ErrorCode {
  MISSING_CREDENTIALS = "MISSING_CREDENTIALS",
  PROVIDER_ERROR = "PROVIDER_ERROR",
  RATE_LIMITED = "RATE_LIMITED",
  RENDER_FAILED = "RENDER_FAILED",
  EXPORT_FAILED = "EXPORT_FAILED",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
}

export class TypesetError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly statusCode: number;
  readonly context: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCode,
    options: {
      retryable?: boolean;
      statusCode?: number;
      context?: Record<string, unknown>;
      cause?: Error;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "TypesetError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.statusCode = options.statusCode ?? 500;
    this.context = options.context ?? {};
  }

  static missingCredentials(provider: string, envVars: string[]): TypesetError {
    return new TypesetError(
      `Missing credentials for ${provider}. Set one of: ${envVars.join(", ")}`,
      ErrorCode.MISSING_CREDENTIALS,
      { statusCode: 401, context: { provider, envVars } },
    );
  }

  static providerError(provider: string, status: number, body: string): TypesetError {
    const retryable = status === 429 || status >= 500;
    return new TypesetError(
      `${provider} API error (${status}): ${body}`,
      ErrorCode.PROVIDER_ERROR,
      { retryable, statusCode: 502, context: { provider, upstreamStatus: status } },
    );
  }

  static rateLimited(retryAfterSeconds?: number): TypesetError {
    return new TypesetError(
      `Rate limited. ${retryAfterSeconds ? `Retry after ${retryAfterSeconds}s` : "Please wait."}`,
      ErrorCode.RATE_LIMITED,
      { retryable: true, statusCode: 429, context: { retryAfterSeconds } },
    );
  }

  static renderFailed(format: string, reason: string, cause?: Error): TypesetError {
    return new TypesetError(
      `Failed to render ${format}: ${reason}`,
      ErrorCode.RENDER_FAILED,
      { statusCode: 500, context: { format }, cause },
    );
  }

  static exportFailed(format: string, reason: string, cause?: Error): TypesetError {
    return new TypesetError(
      `Failed to export ${format}: ${reason}`,
      ErrorCode.EXPORT_FAILED,
      { statusCode: 500, context: { format }, cause },
    );
  }

  static validationError(field: string, message: string): TypesetError {
    return new TypesetError(
      `Validation error on "${field}": ${message}`,
      ErrorCode.VALIDATION_ERROR,
      { statusCode: 400, context: { field } },
    );
  }

  static notFound(resource: string, id: string): TypesetError {
    return new TypesetError(
      `${resource} not found: ${id}`,
      ErrorCode.NOT_FOUND,
      { statusCode: 404, context: { resource, id } },
    );
  }

  static configurationError(message: string): TypesetError {
    return new TypesetError(
      `Configuration error: ${message}`,
      ErrorCode.CONFIGURATION_ERROR,
      { statusCode: 500 },
    );
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        retryable: this.retryable,
        context: Object.keys(this.context).length > 0 ? this.context : undefined,
      },
    };
  }

  toResponse(): Response {
    return Response.json(this.toJSON(), { status: this.statusCode });
  }
}
