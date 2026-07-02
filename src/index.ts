import { parseBoolean, parseEnum, parseNumber, parseString, parseUrl } from "./parsers.js";
import {
  EnvSchema,
  EnvSource,
  EnvValidationError,
  EnvValidationIssue,
  InferEnv,
} from "./types.js";

export interface EnvOptions {
  source?: EnvSource;
}

export type SafeEnvResult<T extends EnvSchema> =
  | { success: true; data: InferEnv<T> }
  | { success: false; error: EnvValidationError };

function validateEnv<T extends EnvSchema>(
  schema: T,
  source: EnvSource,
): { data: InferEnv<T>; issues: EnvValidationIssue[] } {
  const result = {} as InferEnv<T>;
  const issues: EnvValidationIssue[] = [];

  for (const key of Object.keys(schema)) {
    const field = schema[key];
    const raw = source[key];

    try {
      switch (field.type) {
        case "string":
          (result as Record<string, unknown>)[key] = parseString(key, raw, field);
          break;
        case "number":
          (result as Record<string, unknown>)[key] = parseNumber(key, raw, field);
          break;
        case "boolean":
          (result as Record<string, unknown>)[key] = parseBoolean(key, raw, field);
          break;
        case "enum":
          (result as Record<string, unknown>)[key] = parseEnum(key, raw, field);
          break;
        case "url":
          (result as Record<string, unknown>)[key] = parseUrl(key, raw, field);
          break;
        default: {
          const exhaustive: never = field;
          throw new Error(`Unsupported field type for "${key}"`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      issues.push({ key, message });
    }
  }

  return { data: result, issues };
}

export function env<T extends EnvSchema>(schema: T, options: EnvOptions = {}): InferEnv<T> {
  const source = options.source ?? process.env;
  const { data, issues } = validateEnv(schema, source);

  if (issues.length > 0) {
    throw new EnvValidationError(issues);
  }

  return data;
}

export function safeEnv<T extends EnvSchema>(
  schema: T,
  options: EnvOptions = {},
): SafeEnvResult<T> {
  const source = options.source ?? process.env;
  const { data, issues } = validateEnv(schema, source);

  if (issues.length > 0) {
    return { success: false, error: new EnvValidationError(issues) };
  }

  return { success: true, data };
}

export { EnvValidationError } from "./types.js";
export type {
  BooleanField,
  EnumField,
  EnvField,
  EnvSchema,
  EnvSource,
  EnvValidationIssue,
  InferEnv,
  NumberField,
  StringField,
  UrlField,
} from "./types.js";
