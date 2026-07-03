/**
 * Express integration — validate env before the server starts.
 */
import {
  defineSchema,
  env,
  envDiff,
  formatEnvReport,
  mergeSchemas,
  presets,
} from "../src/index.js";

const schema = defineSchema(mergeSchemas([presets.server, presets.database, presets.auth]));

const diff = envDiff(schema, { envFiles: [".env"] });
if (!diff.valid) {
  console.error(formatEnvReport(diff));
  process.exit(1);
}

export const config = env(schema, {
  envFiles: [".env"],
  strict: true,
});

// import express from "express";
// const app = express();
// app.listen(config.PORT, () => console.log(`Listening on ${config.PORT}`));

console.log(`Express ready on port ${config.PORT}`);
