/**
 * Example using SchemaBuilder and envDiff for debugging.
 */
import { createSchemaBuilder, envDiff } from "../src/index.js";

const schema = createSchemaBuilder()
  .string("API_KEY", { required: true, description: "External API key" })
  .port("PORT")
  .duration("REQUEST_TIMEOUT", { default: 30_000 })
  .uuid("INSTANCE_ID")
  .build();

const report = envDiff(schema, {
  source: {
    PORT: "3000",
    REQUEST_TIMEOUT: "30s",
  },
});

if (!report.valid) {
  console.error("Environment check failed:");
  console.error("Missing:", report.missing.join(", ") || "none");
  console.error("Invalid:", report.invalid.join(", ") || "none");
  for (const issue of report.issues) {
    console.error(`  - ${issue.key}: ${issue.message}`);
  }
  process.exit(1);
}

console.log("All required variables present and valid");
