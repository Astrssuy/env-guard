import { describe, expect, it } from "vitest";
import { env, EnvValidationError, safeEnv } from "../src/index.js";

describe("env-guard", () => {
  it("parses required string variables", () => {
    const config = env(
      {
        DATABASE_URL: { type: "string", required: true },
      },
      { source: { DATABASE_URL: "postgres://localhost/app" } },
    );

    expect(config.DATABASE_URL).toBe("postgres://localhost/app");
  });

  it("applies number defaults", () => {
    const config = env(
      {
        PORT: { type: "number", default: 3000 },
      },
      { source: {} },
    );

    expect(config.PORT).toBe(3000);
  });

  it("parses booleans from common string values", () => {
    const config = env(
      {
        DEBUG: { type: "boolean" },
        VERBOSE: { type: "boolean" },
      },
      { source: { DEBUG: "true", VERBOSE: "0" } },
    );

    expect(config.DEBUG).toBe(true);
    expect(config.VERBOSE).toBe(false);
  });

  it("validates enum values", () => {
    const config = env(
      {
        NODE_ENV: {
          type: "enum",
          values: ["development", "production", "test"] as const,
        },
      },
      { source: { NODE_ENV: "production" } },
    );

    expect(config.NODE_ENV).toBe("production");
  });

  it("throws EnvValidationError with all issues at once", () => {
    expect(() =>
      env(
        {
          DATABASE_URL: { type: "string", required: true },
          PORT: { type: "number", required: true },
          NODE_ENV: {
            type: "enum",
            values: ["development", "production"] as const,
          },
        },
        {
          source: {
            PORT: "not-a-number",
            NODE_ENV: "staging",
          },
        },
      ),
    ).toThrow(EnvValidationError);

    try {
      env(
        {
          DATABASE_URL: { type: "string", required: true },
          PORT: { type: "number", required: true },
        },
        { source: { PORT: "abc" } },
      );
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      const validationError = error as EnvValidationError;
      expect(validationError.issues).toHaveLength(2);
      expect(validationError.issues[0]?.key).toBe("DATABASE_URL");
      expect(validationError.issues[1]?.message).toContain("must be a number");
    }
  });

  it("formats a readable error message", () => {
    try {
      env(
        {
          API_KEY: { type: "string", required: true },
        },
        { source: {} },
      );
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      expect((error as Error).message).toContain("API_KEY: is required");
    }
  });

  it("parses and validates URL variables", () => {
    const config = env(
      {
        DATABASE_URL: { type: "url", required: true, protocols: ["postgres"] },
        APP_URL: { type: "url", default: "http://localhost:3000" },
      },
      {
        source: {
          DATABASE_URL: "postgres://localhost:5432/app",
        },
      },
    );

    expect(config.DATABASE_URL).toBe("postgres://localhost:5432/app");
    expect(config.APP_URL).toBe("http://localhost:3000");
  });

  it("rejects invalid URLs and wrong protocols", () => {
    expect(() =>
      env(
        {
          DATABASE_URL: { type: "url", protocols: ["https"] },
        },
        { source: { DATABASE_URL: "not-a-url" } },
      ),
    ).toThrow(EnvValidationError);

    expect(() =>
      env(
        {
          API_URL: { type: "url", protocols: ["https"] },
        },
        { source: { API_URL: "http://example.com" } },
      ),
    ).toThrow(EnvValidationError);
  });

  it("returns a result object with safeEnv instead of throwing", () => {
    const failure = safeEnv(
      {
        PORT: { type: "number", required: true },
      },
      { source: { PORT: "abc" } },
    );

    expect(failure.success).toBe(false);
    if (!failure.success) {
      expect(failure.error).toBeInstanceOf(EnvValidationError);
      expect(failure.error.issues[0]?.key).toBe("PORT");
    }

    const success = safeEnv(
      {
        PORT: { type: "number", default: 3000 },
      },
      { source: {} },
    );

    expect(success.success).toBe(true);
    if (success.success) {
      expect(success.data.PORT).toBe(3000);
    }
  });
});
