import type { EnvOptions, EnvSchema, InferEnv } from "./types.js";

export interface EnvModule<T extends EnvSchema> {
  get(): InferEnv<T>;
  reload(): InferEnv<T>;
  readonly schema: T;
}

export function createEnvModule<T extends EnvSchema>(
  schema: T,
  load: () => InferEnv<T>,
): EnvModule<T> {
  let cached: InferEnv<T> | null = null;

  return {
    schema,
    get() {
      if (cached === null) {
        cached = load();
      }
      return cached;
    },
    reload() {
      cached = load();
      return cached;
    },
  };
}
