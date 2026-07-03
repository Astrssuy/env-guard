import {
  extendSchema,
  generateEnvExample,
  getSchemaEnvKeys,
  loadEnvFile,
  loadEnvFiles,
  maskSecret,
  mergeSchemas,
  omitSchema,
  parseEnvContent,
  pickSchema,
} from "./helpers.js";
import { createEnvLoader } from "./loader.js";
import { createSchemaBuilder, SchemaBuilder } from "./builder.js";
import { createEnvModule } from "./module.js";
import { field, presets } from "./presets.js";
import {
  exportSchemaMarkdown,
  formatEnvReport,
  redactForLogging,
  redactSourceForLogging,
} from "./reporting.js";
import { envDiffInternal, validateEnvInternal } from "./validate.js";
import {
  defineSchema,
  EnvValidationError,
  formatIssues,
  type EnvDiffResult,
  type EnvOptions,
  type EnvSchema,
  type EnvSource,
  type InferEnv,
  type SafeEnvResult,
} from "./types.js";

function resolveSource(options: EnvOptions): EnvSource {
  const merged = { ...process.env, ...options.source };

  if (options.envFiles) {
    Object.assign(merged, loadEnvFiles(options.envFiles));
  }

  return merged;
}

function validateOptions(options: EnvOptions) {
  return {
    prefix: options.prefix,
    strict: options.strict,
    onDeprecated: options.onDeprecated,
  };
}

function handleValidationFailure(
  issues: ConstructorParameters<typeof EnvValidationError>[0],
  options: EnvOptions,
): EnvValidationError {
  const error = new EnvValidationError(issues);
  options.onValidationError?.(error);
  return error;
}

export function env<T extends EnvSchema>(schema: T, options: EnvOptions = {}): InferEnv<T> {
  const { data, issues } = validateEnvInternal(schema, resolveSource(options), validateOptions(options));

  if (issues.length > 0) {
    throw handleValidationFailure(issues, options);
  }

  return data;
}

export function safeEnv<T extends EnvSchema>(
  schema: T,
  options: EnvOptions = {},
): SafeEnvResult<T> {
  const { data, issues } = validateEnvInternal(schema, resolveSource(options), validateOptions(options));

  if (issues.length > 0) {
    return { success: false, error: handleValidationFailure(issues, options) };
  }

  return { success: true, data };
}

export function assertEnv<T extends EnvSchema>(schema: T, options: EnvOptions = {}): InferEnv<T> {
  return env(schema, options);
}

export function envDiff<T extends EnvSchema>(
  schema: T,
  options: EnvOptions = {},
): EnvDiffResult {
  return envDiffInternal(schema, resolveSource(options), validateOptions(options));
}

/**
 * CI-friendly check. Returns exit code 0 on success, 1 on failure.
 * Usage: process.exit(checkEnv(schema, options))
 */
export function checkEnv<T extends EnvSchema>(schema: T, options: EnvOptions = {}): 0 | 1 {
  const result = safeEnv(schema, options);

  if (!result.success) {
    console.error(result.error.message);
    return 1;
  }

  return 0;
}

/**
 * Validate env files against a schema without starting the app.
 */
export function validateEnvFiles<T extends EnvSchema>(
  schema: T,
  paths: string[],
  options: Omit<EnvOptions, "envFiles"> = {},
): SafeEnvResult<T> {
  return safeEnv(schema, {
    ...options,
    source: { ...options.source, ...loadEnvFiles(paths) },
  });
}

export function createValidatedEnvModule<T extends EnvSchema>(
  schema: T,
  options: EnvOptions = {},
) {
  return createEnvModule(schema, () => env(schema, options));
}

export { VERSION } from "./version.js";
export {
  createEnvLoader,
  createSchemaBuilder,
  defineSchema,
  extendSchema,
  exportSchemaMarkdown,
  field,
  formatEnvReport,
  generateEnvExample,
  getSchemaEnvKeys,
  loadEnvFile,
  loadEnvFiles,
  maskSecret,
  mergeSchemas,
  omitSchema,
  parseEnvContent,
  pickSchema,
  presets,
  redactForLogging,
  redactSourceForLogging,
  SchemaBuilder,
  EnvValidationError,
  formatIssues,
};
export type { EnvLoaderOptions } from "./loader.js";
export type { EnvModule } from "./module.js";
export type {
  ArrayField,
  BooleanField,
  DurationField,
  EmailField,
  EnumField,
  EnvDiffResult,
  EnvField,
  EnvOptions,
  EnvSchema,
  EnvSource,
  EnvValidationIssue,
  InferEnv,
  IntegerField,
  JsonField,
  NumberField,
  PortField,
  SafeEnvResult,
  SecretField,
  StringField,
  UrlField,
  UuidField,
} from "./types.js";
