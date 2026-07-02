import { describe, expect, it } from "vitest";
import { env, EnvValidationError, generateEnvExample, safeEnv } from "../src/index.js";

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

  it("validates string length and pattern", () => {
    const config = env(
      {
        API_KEY: { type: "string", minLength: 8, pattern: "^sk_" },
      },
      { source: { API_KEY: "  sk_live_12345678  " } },
    );

    expect(config.API_KEY).toBe("sk_live_12345678");

    expect(() =>
      env(
        { API_KEY: { type: "string", minLength: 10 } },
        { source: { API_KEY: "short" } },
      ),
    ).toThrow(EnvValidationError);
  });

  it("validates number ranges and integers", () => {
    const config = env(
      {
        PORT: { type: "number", min: 1, max: 65535, integer: true },
      },
      { source: { PORT: "8080" } },
    );

    expect(config.PORT).toBe(8080);

    expect(() =>
      env(
        { PORT: { type: "number", integer: true } },
        { source: { PORT: "3.14" } },
      ),
    ).toThrow(EnvValidationError);

    expect(() =>
      env(
        { PORT: { type: "number", max: 100 } },
        { source: { PORT: "3000" } },
      ),
    ).toThrow(EnvValidationError);
  });

  it("parses comma-separated arrays", () => {
    const config = env(
      {
        ALLOWED_ORIGINS: {
          type: "array",
          minItems: 1,
        },
      },
      { source: { ALLOWED_ORIGINS: "http://a.com, http://b.com" } },
    );

    expect(config.ALLOWED_ORIGINS).toEqual(["http://a.com", "http://b.com"]);
  });

  it("reads variables with a prefix", () => {
    const config = env(
      {
        PORT: { type: "number", default: 3000 },
        DEBUG: { type: "boolean", default: false },
      },
      {
        prefix: "APP_",
        source: {
          APP_PORT: "4000",
          APP_DEBUG: "true",
        },
      },
    );

    expect(config.PORT).toBe(4000);
    expect(config.DEBUG).toBe(true);
  });

  it("generates an .env.example from a schema", () => {
    const example = generateEnvExample(
      {
        PORT: { type: "number", default: 3000 },
        DATABASE_URL: { type: "url", required: true },
        ALLOWED_ORIGINS: { type: "array", default: ["http://localhost:3000"] },
      },
      { prefix: "APP_" },
    );

    expect(example).toContain("APP_PORT=3000");
    expect(example).toContain("APP_DATABASE_URL=https://example.com");
    expect(example).toContain("APP_ALLOWED_ORIGINS=http://localhost:3000");
    expect(example).toContain("# DATABASE_URL (required)");
  });
});
