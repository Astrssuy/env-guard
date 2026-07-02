import { loadEnvFiles } from "./helpers.js";
import { validateEnvInternal } from "./validate.js";
import {
  EnvValidationError,
  type EnvSchema,
  type EnvSource,
  type InferEnv,
  type SafeEnvResult,
} from "./types.js";

export interface EnvLoaderOptions {
  prefix?: string;
  envFiles?: string[];
  onValidationError?: (error: EnvValidationError) => void;
  onDeprecated?: (key: string, message: string) => void;
}

export function createEnvLoader(defaultOptions: EnvLoaderOptions = {}) {
  function resolveSource(source?: EnvSource): EnvSource {
    const merged: EnvSource = { ...process.env, ...source };

    if (defaultOptions.envFiles) {
      Object.assign(merged, loadEnvFiles(defaultOptions.envFiles));
    }

    return merged;
  }

  function load<T extends EnvSchema>(schema: T, overrides: EnvSource = {}): InferEnv<T> {
    const result = safeLoad(schema, overrides);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  }

  function safeLoad<T extends EnvSchema>(
    schema: T,
    overrides: EnvSource = {},
  ): SafeEnvResult<T> {
    const { data, issues } = validateEnvInternal(schema, resolveSource(overrides), {
      prefix: defaultOptions.prefix,
      onDeprecated: defaultOptions.onDeprecated,
    });

    if (issues.length > 0) {
      const error = new EnvValidationError(issues);
      defaultOptions.onValidationError?.(error);
      return { success: false, error };
    }

    return { success: true, data };
  }

  return { load, safeLoad, resolveSource };
}
