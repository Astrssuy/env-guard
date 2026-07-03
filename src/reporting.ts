import { getSchemaEnvKeys, maskSecret, resolveEnvKey } from "./helpers.js";
import type { EnvField, EnvSchema, EnvValidationIssue } from "./types.js";

export function redactForLogging<T extends EnvSchema>(
  data: Record<string, unknown>,
  schema: T,
): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};

  for (const key of Object.keys(schema)) {
    const field = schema[key];
    const value = data[key];

    if (field.type === "secret" && typeof value === "string") {
      redacted[key] = maskSecret(value);
      continue;
    }

    if (field.type === "json" && value !== null && typeof value === "object") {
      redacted[key] = "[object]";
      continue;
    }

    redacted[key] = value;
  }

  return redacted;
}

export function exportSchemaMarkdown(
  schema: EnvSchema,
  options: { prefix?: string; title?: string } = {},
): string {
  const title = options.title ?? "Environment Variables";
  const lines = [`# ${title}`, "", "| Variable | Type | Required | Description |", "|----------|------|----------|-------------|"];

  for (const [key, field] of Object.entries(schema)) {
    const envKey = resolveEnvKey(key, options.prefix, field.envKey);
    const required = field.required !== false && field.default === undefined ? "Yes" : "No";
    const description = field.description ?? "—";
    lines.push(`| \`${envKey}\` | ${field.type} | ${required} | ${description} |`);
  }

  lines.push("");
  return lines.join("\n");
}

export function formatEnvReport(diff: {
  valid: boolean;
  missing: string[];
  invalid: string[];
  present: string[];
  issues: EnvValidationIssue[];
}): string {
  const lines = [
    "Environment Report",
    "==================",
    `Status: ${diff.valid ? "OK" : "FAILED"}`,
    "",
    `Present (${diff.present.length}): ${diff.present.join(", ") || "none"}`,
    `Missing (${diff.missing.length}): ${diff.missing.join(", ") || "none"}`,
    `Invalid (${diff.invalid.length}): ${diff.invalid.join(", ") || "none"}`,
  ];

  if (diff.issues.length > 0) {
    lines.push("", "Issues:");
    for (const issue of diff.issues) {
      const label = issue.description ? `${issue.key} (${issue.description})` : issue.key;
      lines.push(`  - ${label}: ${issue.message}`);
    }
  }

  return lines.join("\n");
}

function isSensitiveKey(key: string): boolean {
  return /secret|password|token|key|auth|credential/i.test(key);
}

export function redactSourceForLogging(source: Record<string, string | undefined>): Record<string, string> {
  const redacted: Record<string, string> = {};

  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue;
    redacted[key] = isSensitiveKey(key) ? maskSecret(value) : value;
  }

  return redacted;
}
