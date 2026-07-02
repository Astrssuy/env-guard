/**
 * Basic usage example for env-guard.
 * Run with: npx tsx examples/basic.ts
 */
import { env, generateEnvExample, safeEnv } from "../src/index.js";

const schema = {
  PORT: { type: "port" as const, default: 3000, description: "HTTP port" },
  NODE_ENV: {
    type: "enum" as const,
    values: ["development", "production", "test"] as const,
    default: "development",
  },
  ADMIN_EMAIL: { type: "email" as const, required: true },
  FEATURE_FLAGS: { type: "json" as const, default: { beta: false } },
};

const result = safeEnv(schema, {
  source: {
    PORT: "8080",
    ADMIN_EMAIL: "admin@example.com",
    FEATURE_FLAGS: '{"beta":true}',
  },
});

if (!result.success) {
  console.error(result.error.message);
  process.exit(1);
}

console.log("Config loaded:", result.data);
console.log("\n--- .env.example ---\n");
console.log(generateEnvExample(schema));
