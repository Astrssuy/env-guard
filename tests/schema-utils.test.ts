import { describe, expect, it } from "vitest";
import {
  loadEnvFile,
  mergeSchemas,
  omitSchema,
  parseEnvContent,
  pickSchema,
} from "../src/index.js";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

describe("schema utilities", () => {
  const baseSchema = {
    PORT: { type: "number" as const, default: 3000 },
    DEBUG: { type: "boolean" as const, default: false },
    API_KEY: { type: "string" as const, required: true },
  };

  it("merges two schemas", () => {
    const merged = mergeSchemas(baseSchema, {
      DATABASE_URL: { type: "url" as const, required: true },
    });

    expect(Object.keys(merged)).toEqual(["PORT", "DEBUG", "API_KEY", "DATABASE_URL"]);
  });

  it("picks selected keys from a schema", () => {
    const picked = pickSchema(baseSchema, ["PORT", "DEBUG"]);

    expect(Object.keys(picked)).toEqual(["PORT", "DEBUG"]);
    expect(picked.PORT.default).toBe(3000);
  });

  it("omits selected keys from a schema", () => {
    const omitted = omitSchema(baseSchema, ["API_KEY"]);

    expect(Object.keys(omitted)).toEqual(["PORT", "DEBUG"]);
    expect("API_KEY" in omitted).toBe(false);
  });
});

describe("env file loading", () => {
  const tempPath = join(process.cwd(), ".env.test-temp");

  it("parses env file content", () => {
    const parsed = parseEnvContent(`
      # comment
      PORT=3000
      DEBUG=true
      QUOTED="hello world"
    `);

    expect(parsed).toEqual({
      PORT: "3000",
      DEBUG: "true",
      QUOTED: "hello world",
    });
  });

  it("loads env variables from a file", () => {
    writeFileSync(tempPath, "PORT=4000\nAPI_KEY=secret\n", "utf-8");

    try {
      const loaded = loadEnvFile(tempPath);
      expect(loaded).toEqual({ PORT: "4000", API_KEY: "secret" });
    } finally {
      unlinkSync(tempPath);
    }
  });
});
