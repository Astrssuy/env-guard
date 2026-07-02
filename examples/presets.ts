/**
 * Example using presets and createEnvLoader.
 */
import { mergeSchemas, presets } from "../src/index.js";

const schema = mergeSchemas([presets.server, presets.database, presets.auth]);

const loadConfig = createEnvLoader({
  envFiles: [".env", ".env.local"],
  prefix: "APP_",
  onDeprecated: (key, message) => {
    console.warn(`[deprecated] ${key}: ${message}`);
  },
});

const config = loadConfig.load(schema, {
  APP_PORT: "8080",
  APP_DATABASE_URL: "postgres://localhost:5432/app",
  APP_JWT_SECRET: "a".repeat(32),
});

console.log("Server config:", {
  port: config.PORT,
  nodeEnv: config.NODE_ENV,
  logLevel: config.LOG_LEVEL,
  database: config.DATABASE_URL,
});
