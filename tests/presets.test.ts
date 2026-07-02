import { describe, expect, it } from "vitest";
import {
  createEnvLoader,
  createSchemaBuilder,
  defineSchema,
  envDiff,
  field,
  mergeSchemas,
  presets,
} from "../src/index.js";

describe("presets and field helpers", () => {
  it("builds schemas with field helpers", () => {
    const schema = defineSchema({
      PORT: field.port(),
      NODE_ENV: field.nodeEnv(),
      LOG_LEVEL: field.logLevel(),
      JWT_SECRET: field.secret({ minLength: 32 }),
    });

    expect(schema.PORT.type).toBe("port");
    expect(schema.NODE_ENV.type).toBe("enum");
  });

  it("merges preset groups", () => {
    const schema = mergeSchemas([presets.server, presets.database, presets.auth]);

    expect(schema.PORT.type).toBe("port");
    expect(schema.DATABASE_URL.type).toBe("url");
    expect(schema.JWT_SECRET.type).toBe("secret");
  });
});

describe("SchemaBuilder", () => {
  it("builds schemas fluently", () => {
    const schema = createSchemaBuilder()
      .string("API_KEY", { required: true })
      .number("PORT", { default: 3000 })
      .boolean("DEBUG", { default: false })
      .enum("NODE_ENV", ["dev", "prod"] as const, { default: "dev" })
      .build();

    expect(Object.keys(schema)).toEqual(["API_KEY", "PORT", "DEBUG", "NODE_ENV"]);
  });
});

describe("createEnvLoader", () => {
  it("loads config with a reusable loader", () => {
    const loader = createEnvLoader({ prefix: "APP_" });

    const config = loader.load(
      {
        PORT: { type: "port", default: 3000 },
      },
      { APP_PORT: "4000" },
    );

    expect(config.PORT).toBe(4000);
  });
});

describe("envDiff", () => {
  it("reports missing and invalid variables without throwing", () => {
    const diff = envDiff(
      {
        API_KEY: { type: "string", required: true },
        PORT: { type: "port", required: true },
      },
      {
        source: {
          PORT: "99999",
        },
      },
    );

    expect(diff.valid).toBe(false);
    expect(diff.missing).toContain("API_KEY");
    expect(diff.invalid).toContain("PORT");
    expect(diff.issues.length).toBeGreaterThan(0);
  });
});
