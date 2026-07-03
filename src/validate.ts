import { getSchemaEnvKeys, resolveEnvKey } from "./helpers.js";
import {
  applyTransform,
  getDeprecatedMessage,
  parseArray,
  parseBoolean,
  parseDuration,
  parseEmail,
  parseEnum,
  parseInteger,
  parseJson,
  parseNumber,
  parsePort,
  parseSecret,
  parseString,
  parseUrl,
  parseUuid,
  runCustomValidate,
} from "./parsers.js";
import type {
  EnvField,
  EnvSchema,
  EnvSource,
  EnvValidationIssue,
  InferEnv,
} from "./types.js";

export interface ValidateOptions {
  prefix?: string;
  strict?: boolean;
  onDeprecated?: (key: string, message: string) => void;
}

function effectiveField(field: EnvField, source: EnvSource): EnvField {
  if (field.requiredWhen) {
    return {
      ...field,
      required: field.requiredWhen(source),
    };
  }
  return field;
}

function collectStrictIssues(
  schema: EnvSchema,
  source: EnvSource,
  prefix?: string,
): EnvValidationIssue[] {
  const knownKeys = new Set(getSchemaEnvKeys(schema, prefix));
  const issues: EnvValidationIssue[] = [];

  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === "") continue;
    if (prefix && !key.startsWith(prefix)) continue;
    if (knownKeys.has(key)) continue;

    issues.push({
      key,
      message: "unknown environment variable (strict mode)",
    });
  }

  return issues;
}

export function parseField(
  key: string,
  raw: string | undefined,
  field: EnvField,
  options: ValidateOptions = {},
): unknown {
  const deprecatedMessage = getDeprecatedMessage(field.deprecated);
  if (deprecatedMessage && raw !== undefined && raw !== "") {
    options.onDeprecated?.(key, deprecatedMessage);
  }

  let value: unknown;

  switch (field.type) {
    case "string":
      value = parseString(key, raw, field);
      break;
    case "number":
      value = parseNumber(key, raw, field);
      break;
    case "integer":
      value = parseInteger(key, raw, field);
      break;
    case "boolean":
      value = parseBoolean(key, raw, field);
      break;
    case "enum":
      value = parseEnum(key, raw, field);
      break;
    case "url":
      value = parseUrl(key, raw, field);
      break;
    case "array":
      value = parseArray(key, raw, field);
      break;
    case "email":
      value = parseEmail(key, raw, field);
      break;
    case "json":
      value = parseJson(key, raw, field);
      break;
    case "port":
      value = parsePort(key, raw, field);
      break;
    case "duration":
      value = parseDuration(key, raw, field);
      break;
    case "uuid":
      value = parseUuid(key, raw, field);
      break;
    case "secret":
      value = parseSecret(key, raw, field);
      break;
    default: {
      const exhaustive: never = field;
      throw new Error(`Unsupported field type for "${key}"`);
    }
  }

  runCustomValidate(value, field.validate);
  return applyTransform(value, field.transform);
}

export function validateEnvInternal<T extends EnvSchema>(
  schema: T,
  source: EnvSource,
  options: ValidateOptions = {},
): { data: InferEnv<T>; issues: EnvValidationIssue[] } {
  const result = {} as InferEnv<T>;
  const issues: EnvValidationIssue[] = [];

  for (const key of Object.keys(schema)) {
    const field = schema[key];

    if (field.skipWhen?.(source)) {
      continue;
    }

    const resolved = effectiveField(field, source);
    const raw = source[resolveEnvKey(key, options.prefix, field.envKey)];

    try {
      (result as Record<string, unknown>)[key] = parseField(key, raw, resolved, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      issues.push({
        key,
        message,
        description: field.description,
      });
    }
  }

  if (options.strict) {
    issues.push(...collectStrictIssues(schema, source, options.prefix));
  }

  return { data: result, issues };
}

export function envDiffInternal<T extends EnvSchema>(
  schema: T,
  source: EnvSource,
  options: ValidateOptions = {},
): {
  valid: boolean;
  issues: EnvValidationIssue[];
  missing: string[];
  invalid: string[];
  present: string[];
} {
  const { issues } = validateEnvInternal(schema, source, options);
  const missing = issues.filter((issue) => issue.message === "is required").map((issue) => issue.key);
  const invalid = issues
    .filter((issue) => issue.message !== "is required")
    .map((issue) => issue.key);
  const present = Object.keys(schema).filter((key) => !missing.includes(key) && !invalid.includes(key));

  return {
    valid: issues.length === 0,
    issues,
    missing,
    invalid,
    present,
  };
}
