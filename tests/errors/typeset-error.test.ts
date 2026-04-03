import { describe, it, expect } from "vitest";
import { ErrorCode, TypesetError } from "@typeset-ai/errors";

describe("TypesetError", () => {
  it("should create error with code and message", () => {
    const error = new TypesetError("something went wrong", ErrorCode.NETWORK_ERROR);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(TypesetError);
    expect(error.message).toBe("something went wrong");
    expect(error.code).toBe(ErrorCode.NETWORK_ERROR);
    expect(error.name).toBe("TypesetError");
  });

  it("missingCredentials should set statusCode 401 and include provider context", () => {
    const error = TypesetError.missingCredentials("anthropic", [
      "ANTHROPIC_API_KEY",
      "CLAUDE_API_KEY",
    ]);

    expect(error.code).toBe(ErrorCode.MISSING_CREDENTIALS);
    expect(error.statusCode).toBe(401);
    expect(error.context.provider).toBe("anthropic");
    expect(error.context.envVars).toEqual(["ANTHROPIC_API_KEY", "CLAUDE_API_KEY"]);
    expect(error.retryable).toBe(false);
  });

  it("providerError should be retryable for 5xx status", () => {
    const error500 = TypesetError.providerError("anthropic", 500, "internal server error");
    const error429 = TypesetError.providerError("anthropic", 429, "too many requests");
    const error400 = TypesetError.providerError("anthropic", 400, "bad request");

    expect(error500.retryable).toBe(true);
    expect(error429.retryable).toBe(true);
    expect(error400.retryable).toBe(false);
    expect(error500.statusCode).toBe(502);
  });

  it("rateLimited should be retryable", () => {
    const errorWithDelay = TypesetError.rateLimited(30);
    const errorWithoutDelay = TypesetError.rateLimited();

    expect(errorWithDelay.retryable).toBe(true);
    expect(errorWithDelay.statusCode).toBe(429);
    expect(errorWithDelay.code).toBe(ErrorCode.RATE_LIMITED);
    expect(errorWithDelay.message).toContain("30s");

    expect(errorWithoutDelay.retryable).toBe(true);
    expect(errorWithoutDelay.message).toContain("Please wait.");
  });

  it("toJSON should return structured error format", () => {
    const error = TypesetError.validationError("email", "must be a valid email address");
    const json = error.toJSON();

    expect(json).toEqual({
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation error on "email": must be a valid email address',
        retryable: false,
        context: { field: "email" },
      },
    });
  });

  it("toResponse should return Response with correct status", async () => {
    const error = TypesetError.notFound("document", "doc-123");
    const response = error.toResponse();

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error.code).toBe(ErrorCode.NOT_FOUND);
    expect(body.error.message).toContain("doc-123");
  });
});
