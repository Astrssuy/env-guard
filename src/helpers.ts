import { readFileSync, existsSync } from "node:fs";
import type { EnvField, EnvSchema } from "./types.js";

export function isEmpty(value: string | undefined): value is undefined | "" {
  return value === undefined || value === "";
}

export function resolveEnvKey(key: string, prefix?: string): string {
  return prefix ? `${prefix}${key}` : key;
}

function exampleValue(field: EnvField): string {
  switch (field.type) {
    case "string":
      return field.default ?? "your-value";
    case "number":
      return String(field.default ?? 3000);
    case "boolean":
      return String(field.default ?? false);
    case "enum":
      return field.default ?? field.values[0] ?? "value";
    case "url":
      return field.default ?? "https://example.com";
    case "array":
      return (field.default ?? ["item-a", "item-b"]).join(field.separator ?? ",");
    case "email":
      return field.default ?? "user@example.com";
    case "json":
      return JSON.stringify(field.default ?? { key: "value" });
    case "port":
      return String(field.default ?? 3000);
    default:
      return "value";
  }
}

export function generateEnvExample(schema: EnvSchema, options: { prefix?: string } = {}): string {
  const lines = Object.entries(schema).map(([key, field]) => {
    const envKey = resolveEnvKey(key, options.prefix);
    const required = field.required !== false && field.default === undefined;
    const desc = field.description ? ` — ${field.description}` : "";
    const comment = required ? " (required)" : field.default !== undefined ? " (optional)" : "";
    return `# ${key}${comment}${desc}\n${envKey}=${exampleValue(field)}`;
  });

  return `${lines.join("\n\n")}\n`;
}

export function parseEnvContent(content: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

export function loadEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) {
    throw new Error(`Env file not found: ${path}`);
  }

  return parseEnvContent(readFileSync(path, "utf-8"));
}

export function mergeSchemas<A extends EnvSchema, B extends EnvSchema>(
  first: A,
  second: B,
): A & B {
  return { ...first, ...second };
}

export function pickSchema<T extends EnvSchema, K extends keyof T>(
  schema: T,
  keys: readonly K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    result[key] = schema[key];
  }
  return result;
}

export function omitSchema<T extends EnvSchema, K extends keyof T>(
  schema: T,
  keys: readonly K[],
): Omit<T, K> {
  const omit = new Set<string>(keys as readonly string[]);
  const result = {} as Omit<T, K>;

  for (const key of Object.keys(schema)) {
    if (!omit.has(key)) {
      (result as Record<string, EnvField>)[key] = schema[key];
    }
  }

  return result;
}
