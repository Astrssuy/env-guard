import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { env, EnvValidationError } from "../src/index.js";

const tempPath = join(process.cwd(), ".env.test-new-types");

beforeAll(() => {
  writeFileSync(tempPath, "FROM_FILE=from-file\n", "utf-8");
});

afterAll(() => {
  try {
    unlinkSync(tempPath);
  } catch {
    // file may already be removed
  }
});

describe("duration, uuid, integer and secret types", () => {
  it("parses duration strings to milliseconds", () => {
    const config = env(
      {
        TIMEOUT: { type: "duration", required: true },
        CACHE_TTL: { type: "duration" },
      },
      {
        source: {
          TIMEOUT: "30s",
          CACHE_TTL: "5m",
        },
      },
    );

    expect(config.TIMEOUT).toBe(30_000);
    expect(config.CACHE_TTL).toBe(300_000);
  });

  it("rejects invalid durations", () => {
    expect(() =>
      env({ TIMEOUT: { type: "duration" } }, { source: { TIMEOUT: "fast" } }),
    ).toThrow(EnvValidationError);
  });

  it("validates UUID format", () => {
    const config = env(
      {
        INSTANCE_ID: { type: "uuid", required: true },
      },
      { source: { INSTANCE_ID: "550e8400-e29b-41d4-a716-446655440000" } },
    );

    expect(config.INSTANCE_ID).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("parses integer type", () => {
    const config = env(
      { WORKERS: { type: "integer", min: 1, max: 8 } },
      { source: { WORKERS: "4" } },
    );

    expect(config.WORKERS).toBe(4);

    expect(() =>
      env({ WORKERS: { type: "integer" } }, { source: { WORKERS: "2.5" } }),
    ).toThrow(EnvValidationError);
  });

  it("parses secrets without exposing full value in length errors", () => {
    const config = env(
      { API_KEY: { type: "secret", minLength: 8 } },
      { source: { API_KEY: "super-secret-key" } },
    );

    expect(config.API_KEY).toBe("super-secret-key");

    try {
      env({ API_KEY: { type: "secret", minLength: 20 } }, { source: { API_KEY: "short" } });
    } catch (error) {
      expect((error as Error).message).not.toContain("short");
      expect((error as Error).message).toContain("****");
    }
  });
});

describe("transform, envKey and deprecated", () => {
  it("applies transform after parsing", () => {
    const config = env(
      {
        TAGS: {
          type: "string",
          transform: (value) => (typeof value === "string" ? value.toUpperCase() : value),
        },
      },
      { source: { TAGS: "hello" } },
    );

    expect(config.TAGS).toBe("HELLO");
  });

  it("reads custom envKey instead of schema key", () => {
    const config = env(
      {
        port: { type: "port", envKey: "SERVER_PORT", default: 3000 },
      },
      { source: { SERVER_PORT: "9000" } },
    );

    expect(config.port).toBe(9000);
  });

  it("calls onDeprecated when deprecated field is present", () => {
    const warnings: string[] = [];

    env(
      {
        LEGACY_KEY: {
          type: "string",
          deprecated: "Use NEW_KEY instead",
        },
      },
      {
        source: { LEGACY_KEY: "value" },
        onDeprecated: (key, message) => warnings.push(`${key}:${message}`),
      },
    );

    expect(warnings).toEqual(["LEGACY_KEY:Use NEW_KEY instead"]);
  });
});

describe("envFiles option", () => {
  it("loads variables from env files automatically", () => {
    const config = env(
      { FROM_FILE: { type: "string", required: true } },
      {
        envFiles: [tempPath],
        source: {},
      },
    );

    expect(config.FROM_FILE).toBe("from-file");
  });
});
