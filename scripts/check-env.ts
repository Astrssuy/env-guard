/**
 * CI script example — validate environment before deploy.
 *
 * Usage: npm run check:env
 * Exit code 0 = valid, 1 = invalid (fails CI pipeline)
 */
import { checkEnv, defineSchema, field, mergeSchemas, presets } from "../src/index.js";

const schema = defineSchema(
  mergeSchemas([presets.server, presets.database, presets.auth]),
);

process.exit(
  checkEnv(schema, {
    envFiles: [".env", ".env.example"],
    strict: true,
  }),
);
