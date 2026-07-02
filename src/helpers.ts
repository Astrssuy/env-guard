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
    default:
      return "value";
  }
}

export function generateEnvExample(schema: EnvSchema, options: { prefix?: string } = {}): string {
  const lines = Object.entries(schema).map(([key, field]) => {
    const envKey = resolveEnvKey(key, options.prefix);
    const required = field.required !== false && field.default === undefined;
    const comment = required ? " (required)" : field.default !== undefined ? " (optional)" : "";
    return `# ${key}${comment}\n${envKey}=${exampleValue(field)}`;
  });

  return `${lines.join("\n\n")}\n`;
}
