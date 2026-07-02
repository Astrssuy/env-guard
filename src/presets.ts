import type {
  ArrayField,
  BooleanField,
  DurationField,
  EmailField,
  EnumField,
  IntegerField,
  JsonField,
  NumberField,
  PortField,
  SecretField,
  StringField,
  UrlField,
  UuidField,
} from "./types.js";

type FieldConfig<T> = Omit<T, "type">;

export const field = {
  string: (config: FieldConfig<StringField> = {}) => ({ type: "string" as const, ...config }),
  number: (config: FieldConfig<NumberField> = {}) => ({ type: "number" as const, ...config }),
  integer: (config: FieldConfig<IntegerField> = {}) => ({ type: "integer" as const, ...config }),
  boolean: (config: FieldConfig<BooleanField> = {}) => ({ type: "boolean" as const, ...config }),
  enum: <T extends readonly string[]>(
    values: T,
    config: Omit<FieldConfig<EnumField<T>>, "values"> = {},
  ) => ({ type: "enum" as const, values, ...config }) as EnumField<T>,
  url: (config: FieldConfig<UrlField> = {}) => ({ type: "url" as const, ...config }),
  array: (config: FieldConfig<ArrayField> = {}) => ({ type: "array" as const, ...config }),
  email: (config: FieldConfig<EmailField> = {}) => ({ type: "email" as const, ...config }),
  json: (config: FieldConfig<JsonField> = {}) => ({ type: "json" as const, ...config }),
  port: (config: FieldConfig<PortField> = {}) =>
    ({ type: "port" as const, default: 3000, ...config }) as PortField,
  duration: (config: FieldConfig<DurationField> = {}) =>
    ({ type: "duration" as const, ...config }) as DurationField,
  uuid: (config: FieldConfig<UuidField> = {}) => ({ type: "uuid" as const, ...config }),
  secret: (config: FieldConfig<SecretField> = {}) =>
    ({ type: "secret" as const, required: true, ...config }) as SecretField,

  nodeEnv: (config: Omit<FieldConfig<EnumField<readonly ["development", "production", "test"]>>, "values"> = {}) =>
    field.enum(["development", "production", "test"] as const, {
      default: "development",
      ...config,
    }),

  logLevel: (
    config: Omit<
      FieldConfig<EnumField<readonly ["debug", "info", "warn", "error", "silent"]>>,
      "values"
    > = {},
  ) =>
    field.enum(["debug", "info", "warn", "error", "silent"] as const, {
      default: "info",
      ...config,
    }),

  databaseUrl: (config: FieldConfig<UrlField> = {}) =>
    field.url({
      required: true,
      protocols: ["postgres", "mysql", "sqlite"],
      description: "Database connection URL",
      ...config,
    }),

  redisUrl: (config: FieldConfig<UrlField> = {}) =>
    field.url({
      default: "redis://localhost:6379",
      protocols: ["redis", "rediss"],
      description: "Redis connection URL",
      ...config,
    }),

  apiKey: (config: FieldConfig<SecretField> = {}) =>
    field.secret({
      minLength: 16,
      description: "API secret key",
      ...config,
    }),
};

export const presets = {
  server: {
    PORT: field.port(),
    HOST: field.string({ default: "0.0.0.0" }),
    NODE_ENV: field.nodeEnv(),
    LOG_LEVEL: field.logLevel(),
  },
  database: {
    DATABASE_URL: field.databaseUrl(),
  },
  auth: {
    JWT_SECRET: field.secret({ minLength: 32, description: "JWT signing secret" }),
    SESSION_TTL: field.duration({ default: 86_400_000, description: "Session TTL in ms" }),
  },
  cache: {
    REDIS_URL: field.redisUrl(),
    CACHE_TTL: field.duration({ default: 300_000 }),
  },
} as const;
