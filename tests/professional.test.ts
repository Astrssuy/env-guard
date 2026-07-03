import { describe, expect, it, vi } from "vitest";
import {
  checkEnv,
  env,
  EnvValidationError,
  envDiff,
  exportSchemaMarkdown,
  formatEnvReport,
  redactForLogging,
  redactSourceForLogging,
  validateEnvFiles,
} from "../src/index.js";
import { createEnvModule } from "../src/module.js";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const schema = {
  PORT: { type: "port" as const, default: 3000 },
  API_KEY: { type: "secret" as const, required: true, description: "API secret" },
  SENTRY_DSN: {
    type: "url" as const,
    requiredWhen: (source: Record<string, string | undefined>) =>
      source.NODE_ENV === "production",
  },
  NODE_ENV: {
    type: "enum" as const,
    values: ["development", "production"] as const,
    default: "development",
  },
};

describe("production-oriented validation", () => {
  it("requires fields only when requiredWhen matches", () => {
    expect(() =>
      env(schema, {
        source: {
          NODE_ENV: "development",
          API_KEY: "a".repeat(16),
        },
      }),
    ).not.toThrow();

    expect(() =>
      env(schema, {
        source: {
          NODE_ENV: "production",
          API_KEY: "a".repeat(16),
        },
      }),
    ).toThrow(EnvValidationError);
  });

  it("skips fields when skipWhen is true", () => {
    const config = env(
      {
        OPTIONAL_FEATURE: {
          type: "string",
          required: true,
          skipWhen: (source) => source.ENABLE_FEATURE !== "true",
        },
      },
      { source: { ENABLE_FEATURE: "false" } },
    );

    expect(config).toEqual({});
  });

  it("fails on unknown variables in strict mode", () => {
    expect(() =>
      env(
        { PORT: { type: "port", default: 3000 } },
        {
          strict: true,
          prefix: "APP_",
          source: {
            APP_PORT: "3000",
            APP_UNKNOWN: "value",
          },
        },
      ),
    ).toThrow(EnvValidationError);
  });
});

describe("reporting and redaction", () => {
  it("redacts secrets for safe logging", () => {
    const config = env(schema, {
      source: { API_KEY: "super-secret-key-123", NODE_ENV: "development" },
    });

    const safe = redactForLogging(config, schema);
    expect(safe.API_KEY).toBe("su****23");
    expect(safe.PORT).toBe(3000);
  });

  it("redacts sensitive keys in raw source", () => {
    const safe = redactSourceForLogging({
      PORT: "3000",
      API_SECRET: "hidden-value",
      PUBLIC_URL: "https://example.com",
    });

    expect(safe.API_SECRET).toContain("****");
    expect(safe.PUBLIC_URL).toBe("https://example.com");
  });

  it("exports schema as markdown documentation", () => {
    const md = exportSchemaMarkdown(schema, { title: "App Config" });
    expect(md).toContain("# App Config");
    expect(md).toContain("| `API_KEY` | secret | Yes |");
  });

  it("formats an ops-friendly env report", () => {
    const report = formatEnvReport(
      envDiff(schema, { source: { NODE_ENV: "production", PORT: "abc" } }),
    );

    expect(report).toContain("Environment Report");
    expect(report).toContain("Missing");
    expect(report).toContain("Invalid");
  });

  it("provides structured logs from validation errors", () => {
    try {
      env(schema, { source: { NODE_ENV: "production" } });
    } catch (error) {
      const log = (error as EnvValidationError).toStructuredLog();
      expect(log.event).toBe("env_validation_failed");
      expect(log.issue_count).toBeGreaterThan(0);
    }
  });
});

describe("CI and module patterns", () => {
  it("checkEnv returns exit codes for CI scripts", () => {
    const validSource = { API_KEY: "a".repeat(16), NODE_ENV: "development" };
    expect(checkEnv(schema, { source: validSource })).toBe(0);
    expect(checkEnv(schema, { source: {} })).toBe(1);
  });

  it("validates env files without booting the app", () => {
    const path = join(process.cwd(), ".env.pro-test");
    writeFileSync(path, "API_KEY=1234567890123456\nNODE_ENV=development\n", "utf-8");

    try {
      const result = validateEnvFiles(schema, [path]);
      expect(result.success).toBe(true);
    } finally {
      unlinkSync(path);
    }
  });

  it("createValidatedEnvModule caches config singleton", () => {
    const loader = vi.fn(() =>
      env({ PORT: { type: "port", default: 3000 } }, { source: { PORT: "4000" } }),
    );

    const custom = createEnvModule({ PORT: { type: "port", default: 3000 } }, loader);

    expect(custom.get().PORT).toBe(4000);
    expect(custom.get().PORT).toBe(4000);
    expect(loader).toHaveBeenCalledOnce();

    custom.reload();
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
