import {
  generateEnvExample,
  loadEnvFile,
  mergeSchemas,
  omitSchema,
  parseEnvContent,
  pickSchema,
  resolveEnvKey,
} from "./helpers.js";
import {
  parseArray,
  parseBoolean,
  parseEmail,
  parseEnum,
  parseJson,
  parseNumber,
  parsePort,
  parseString,
  parseUrl,
  runCustomValidate,
} from "./parsers.js";
import {
  EnvField,
  EnvSchema,
  EnvSource,
  EnvValidationError,
  EnvValidationIssue,
  InferEnv,
} from "./types.js";

export interface EnvOptions {
  source?: EnvSource;
  prefix?: string;
  onValidationError?: (error: EnvValidationError) => void;
}

export type SafeEnvResult<T extends EnvSchema> =
  | { success: true; data: InferEnv<T> }
  | { success: false; error: EnvValidationError };

function parseField(key: string, raw: string | undefined, field: EnvField): unknown {
  let value: unknown;

  switch (field.type) {
    case "string":
      value = parseString(key, raw, field);
      break;
    case "number":
      value = parseNumber(key, raw, field);
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
    default: {
      const exhaustive: never = field;
      throw new Error(`Unsupported field type for "${key}"`);
    }
  }

  runCustomValidate(value, field.validate);
  return value;
}

function validateEnv<T extends EnvSchema>(
  schema: T,
  source: EnvSource,
  prefix?: string,
): { data: InferEnv<T>; issues: EnvValidationIssue[] } {
  const result = {} as InferEnv<T>;
  const issues: EnvValidationIssue[] = [];

  for (const key of Object.keys(schema)) {
    const field = schema[key];
    const raw = source[resolveEnvKey(key, prefix)];

    try {
      (result as Record<string, unknown>)[key] = parseField(key, raw, field);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      issues.push({
        key,
        message,
        description: field.description,
      });
    }
  }

  return { data: result, issues };
}

function handleValidationFailure<T extends EnvSchema>(
  issues: EnvValidationIssue[],
  options: EnvOptions,
): never | EnvValidationError {
  const error = new EnvValidationError(issues);
  options.onValidationError?.(error);
  return error;
}

export function env<T extends EnvSchema>(schema: T, options: EnvOptions = {}): InferEnv<T> {
  const source = options.source ?? process.env;
  const { data, issues } = validateEnv(schema, source, options.prefix);

  if (issues.length > 0) {
    throw handleValidationFailure(issues, options);
  }

  return data;
}

export function safeEnv<T extends EnvSchema>(
  schema: T,
  options: EnvOptions = {},
): SafeEnvResult<T> {
  const source = options.source ?? process.env;
  const { data, issues } = validateEnv(schema, source, options.prefix);

  if (issues.length > 0) {
    const error = handleValidationFailure(issues, options) as EnvValidationError;
    return { success: false, error };
  }

  return { success: true, data };
}

export function assertEnv<T extends EnvSchema>(schema: T, options: EnvOptions = {}): InferEnv<T> {
  return env(schema, options);
}

export { VERSION } from "./version.js";
export {
  generateEnvExample,
  loadEnvFile,
  mergeSchemas,
  omitSchema,
  parseEnvContent,
  pickSchema,
} from "./helpers.js";
export { EnvValidationError, formatIssues } from "./types.js";
export type {
  ArrayField,
  BooleanField,
  EmailField,
  EnumField,
  EnvField,
  EnvSchema,
  EnvSource,
  EnvValidationIssue,
  InferEnv,
  JsonField,
  NumberField,
  PortField,
  StringField,
  UrlField,
} from "./types.js";
