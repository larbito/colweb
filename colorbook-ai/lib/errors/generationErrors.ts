/**
 * generationErrors.ts
 * 
 * Typed error classes for image generation failures.
 * Distinguishes between retryable and non-retryable errors.
 */

// ============================================================
// ERROR CODES
// ============================================================

export type NonRetryableErrorCode =
  | "BILLING_LIMIT"           // billing_hard_limit_reached
  | "INSUFFICIENT_QUOTA"      // insufficient_quota
  | "INVALID_API_KEY"         // invalid_api_key
  | "UNAUTHORIZED"            // unauthorized / 401
  | "CONTENT_POLICY"          // content_policy_violation
  | "ACCOUNT_DEACTIVATED"     // account_deactivated
  | "ORGANIZATION_SUSPENDED"; // organization_suspended

export type RetryableErrorCode =
  | "RATE_LIMIT"              // rate_limit_exceeded (429)
  | "SERVER_ERROR"            // 500, 502, 503
  | "TIMEOUT"                 // Request timeout
  | "NETWORK_ERROR"           // Network connectivity
  | "GENERATION_FAILED";      // Generic failure

export type GenerationErrorCode = NonRetryableErrorCode | RetryableErrorCode;

// ============================================================
// NON-RETRYABLE ERROR CLASS
// ============================================================

export interface NonRetryableErrorContext {
  provider: "openai" | "unknown";
  originalCode?: string;
  originalMessage?: string;
  requestId?: string;
  httpStatus?: number;
  pageIndex?: number;
  batchId?: string;
}

/**
 * Error that should NOT be retried.
 * When this is thrown, the generation loop should stop immediately.
 * Examples: billing limit, invalid API key, content policy.
 */
export class NonRetryableGenerationError extends Error {
  public readonly code: NonRetryableErrorCode;
  public readonly context: NonRetryableErrorContext;
  public readonly isNonRetryable = true as const;

  constructor(code: NonRetryableErrorCode, context: NonRetryableErrorContext, message?: string) {
    const defaultMessages: Record<NonRetryableErrorCode, string> = {
      BILLING_LIMIT: "OpenAI billing hard limit reached. Please increase your API budget.",
      INSUFFICIENT_QUOTA: "OpenAI quota exceeded. Please add credits to your account.",
      INVALID_API_KEY: "Invalid OpenAI API key. Please check your configuration.",
      UNAUTHORIZED: "Unauthorized. Please verify your API key and permissions.",
      CONTENT_POLICY: "Content policy violation. Please modify your prompt.",
      ACCOUNT_DEACTIVATED: "OpenAI account deactivated. Please contact support.",
      ORGANIZATION_SUSPENDED: "OpenAI organization suspended. Please contact support.",
    };

    super(message || defaultMessages[code]);
    this.name = "NonRetryableGenerationError";
    this.code = code;
    this.context = context;
  }

  /**
   * Get user-friendly message for display in UI
   */
  getUserMessage(): string {
    switch (this.code) {
      case "BILLING_LIMIT":
        return "Generation paused: OpenAI billing limit reached. Please increase your API budget and click Resume.";
      case "INSUFFICIENT_QUOTA":
        return "Generation paused: OpenAI quota exceeded. Please add credits and click Resume.";
      case "INVALID_API_KEY":
        return "Generation stopped: Invalid API key. Please check your settings.";
      case "UNAUTHORIZED":
        return "Generation stopped: API authorization failed. Please verify your API key.";
      case "CONTENT_POLICY":
        return "This prompt was rejected due to content policy. Please modify it.";
      case "ACCOUNT_DEACTIVATED":
        return "Generation stopped: Your OpenAI account is deactivated.";
      case "ORGANIZATION_SUSPENDED":
        return "Generation stopped: Your OpenAI organization is suspended.";
      default:
        return this.message;
    }
  }

  /**
   * Get action hint for UI
   */
  getActionHint(): string {
    switch (this.code) {
      case "BILLING_LIMIT":
      case "INSUFFICIENT_QUOTA":
        return "Go to OpenAI settings to increase your budget, then click Resume.";
      case "INVALID_API_KEY":
      case "UNAUTHORIZED":
        return "Check your API key in Settings → API Configuration.";
      case "CONTENT_POLICY":
        return "Edit the prompt and try again.";
      default:
        return "Contact support if this persists.";
    }
  }
}

// ============================================================
// RETRYABLE ERROR CLASS
// ============================================================

export interface RetryableErrorContext {
  provider: "openai" | "unknown";
  originalCode?: string;
  originalMessage?: string;
  requestId?: string;
  httpStatus?: number;
  attempt?: number;
  maxAttempts?: number;
}

/**
 * Error that CAN be retried.
 * The generation loop should continue with retry logic.
 */
export class RetryableGenerationError extends Error {
  public readonly code: RetryableErrorCode;
  public readonly context: RetryableErrorContext;
  public readonly isRetryable = true as const;
  public readonly suggestedDelay: number; // ms to wait before retry

  constructor(code: RetryableErrorCode, context: RetryableErrorContext, message?: string) {
    const defaultMessages: Record<RetryableErrorCode, string> = {
      RATE_LIMIT: "Rate limit exceeded. Retrying...",
      SERVER_ERROR: "Server error. Retrying...",
      TIMEOUT: "Request timed out. Retrying...",
      NETWORK_ERROR: "Network error. Retrying...",
      GENERATION_FAILED: "Generation failed. Retrying...",
    };

    super(message || defaultMessages[code]);
    this.name = "RetryableGenerationError";
    this.code = code;
    this.context = context;

    // Suggested delay based on error type
    this.suggestedDelay = code === "RATE_LIMIT" ? 5000 : 1000;
  }
}

// ============================================================
// ERROR CLASSIFICATION HELPER
// ============================================================

/**
 * OpenAI error codes that are NOT retryable
 */
const NON_RETRYABLE_OPENAI_CODES = new Set([
  "billing_hard_limit_reached",
  "insufficient_quota",
  "invalid_api_key",
  "account_deactivated",
  "organization_suspended",
  "content_policy_violation",
  "invalid_request_error", // Usually means bad prompt, not transient
]);

/**
 * HTTP status codes that are NOT retryable
 */
const NON_RETRYABLE_HTTP_STATUS = new Set([
  400, // Bad request (often billing limit)
  401, // Unauthorized
  403, // Forbidden
]);

/**
 * Classify an error from OpenAI API.
 * Returns a typed error object that indicates if retry is allowed.
 */
export function classifyOpenAIError(
  error: unknown,
  context: { pageIndex?: number; batchId?: string; requestId?: string } = {}
): NonRetryableGenerationError | RetryableGenerationError {
  // Extract error details
  const err = error as Record<string, unknown>;
  const status = (err.status as number) || (err.response as { status?: number })?.status;
  const code = (err.code as string) || 
               (err.error as { code?: string })?.code || 
               (err.body as { error?: { code?: string } })?.error?.code;
  const message = (err.message as string) || 
                  (err.error as { message?: string })?.message ||
                  String(error);
  const reqId = (err.request_id as string) || 
                (err.headers as { "x-request-id"?: string })?.["x-request-id"];

  console.log(`[classifyOpenAIError] status=${status}, code=${code}, message="${message?.substring(0, 100)}"`);

  // Check for non-retryable error codes
  if (code && NON_RETRYABLE_OPENAI_CODES.has(code)) {
    const errorCode = mapOpenAICodeToErrorCode(code);
    return new NonRetryableGenerationError(errorCode, {
      provider: "openai",
      originalCode: code,
      originalMessage: message,
      requestId: reqId || context.requestId,
      httpStatus: status,
      pageIndex: context.pageIndex,
      batchId: context.batchId,
    });
  }

  // Check for non-retryable HTTP status
  if (status && NON_RETRYABLE_HTTP_STATUS.has(status)) {
    // Special handling for 400 - often billing limit
    if (status === 400 && message?.toLowerCase().includes("billing")) {
      return new NonRetryableGenerationError("BILLING_LIMIT", {
        provider: "openai",
        originalCode: code,
        originalMessage: message,
        requestId: reqId || context.requestId,
        httpStatus: status,
        pageIndex: context.pageIndex,
        batchId: context.batchId,
      });
    }
    
    // 401 = unauthorized
    if (status === 401) {
      return new NonRetryableGenerationError("UNAUTHORIZED", {
        provider: "openai",
        originalCode: code,
        originalMessage: message,
        requestId: reqId || context.requestId,
        httpStatus: status,
        pageIndex: context.pageIndex,
        batchId: context.batchId,
      });
    }

    // 403 = forbidden (usually API key issue)
    if (status === 403) {
      return new NonRetryableGenerationError("INVALID_API_KEY", {
        provider: "openai",
        originalCode: code,
        originalMessage: message,
        requestId: reqId || context.requestId,
        httpStatus: status,
        pageIndex: context.pageIndex,
        batchId: context.batchId,
      });
    }
  }

  // Check for content policy in message
  if (message?.toLowerCase().includes("content_policy") || 
      message?.toLowerCase().includes("content policy")) {
    return new NonRetryableGenerationError("CONTENT_POLICY", {
      provider: "openai",
      originalCode: code,
      originalMessage: message,
      requestId: reqId || context.requestId,
      httpStatus: status,
      pageIndex: context.pageIndex,
      batchId: context.batchId,
    });
  }

  // Check for rate limit (retryable)
  if (status === 429 || code === "rate_limit_exceeded") {
    return new RetryableGenerationError("RATE_LIMIT", {
      provider: "openai",
      originalCode: code,
      originalMessage: message,
      requestId: reqId || context.requestId,
      httpStatus: status,
    });
  }

  // Check for server errors (retryable)
  if (status && status >= 500) {
    return new RetryableGenerationError("SERVER_ERROR", {
      provider: "openai",
      originalCode: code,
      originalMessage: message,
      requestId: reqId || context.requestId,
      httpStatus: status,
    });
  }

  // Default: retryable generic failure
  return new RetryableGenerationError("GENERATION_FAILED", {
    provider: "openai",
    originalCode: code,
    originalMessage: message,
    requestId: reqId || context.requestId,
    httpStatus: status,
  });
}

/**
 * Map OpenAI error code to our error code
 */
function mapOpenAICodeToErrorCode(openaiCode: string): NonRetryableErrorCode {
  switch (openaiCode) {
    case "billing_hard_limit_reached":
      return "BILLING_LIMIT";
    case "insufficient_quota":
      return "INSUFFICIENT_QUOTA";
    case "invalid_api_key":
      return "INVALID_API_KEY";
    case "account_deactivated":
      return "ACCOUNT_DEACTIVATED";
    case "organization_suspended":
      return "ORGANIZATION_SUSPENDED";
    case "content_policy_violation":
      return "CONTENT_POLICY";
    default:
      return "BILLING_LIMIT"; // Safe default for unknown non-retryable
  }
}

/**
 * Type guard: Check if error is non-retryable
 */
export function isNonRetryableError(error: unknown): error is NonRetryableGenerationError {
  return error instanceof NonRetryableGenerationError;
}

/**
 * Type guard: Check if error is retryable
 */
export function isRetryableError(error: unknown): error is RetryableGenerationError {
  return error instanceof RetryableGenerationError;
}

