/**
 * Production-ready env setup pattern.
 *
 * - Validates once at boot (cached module)
 * - Production-only requirements via requiredWhen
 * - Strict mode catches typos in .env
 * - Safe logging without leaking secrets
 */
import {
  createValidatedEnvModule,
  defineSchema,
  exportSchemaMarkdown,
  field,
  mergeSchemas,
  presets,
  redactForLogging,
} from "../src/index.js";

export const schema = defineSchema(
  mergeSchemas([
    presets.server,
    presets.database,
    presets.auth,
    {
      SENTRY_DSN: field.url({
        requiredWhen: (env) => env.NODE_ENV === "production",
        description: "Error tracking (production only)",
      }),
      STRIPE_KEY: field.secret({
        requiredWhen: (env) => env.NODE_ENV === "production",
        minLength: 32,
        description: "Stripe secret (production only)",
      }),
    },
  ]),
);

export const configModule = createValidatedEnvModule(schema, {
  envFiles: [".env", ".env.local"],
  strict: true,
  prefix: "APP_",
  onDeprecated: (key, message) => {
    console.warn(`[env] deprecated ${key}: ${message}`);
  },
});

export const config = configModule.get();

/** Safe snapshot for logs / health endpoints — never log raw config. */
export function getSafeConfigSnapshot() {
  return redactForLogging(config, schema);
}

/** Generate docs/ENV.md for your team: */
// writeFileSync("docs/ENV.md", exportSchemaMarkdown(schema, { prefix: "APP_", title: "App Environment" }));

console.log("Boot OK:", {
  port: config.PORT,
  nodeEnv: config.NODE_ENV,
  safe: getSafeConfigSnapshot(),
});
