import type {
  BooleanField,
  DurationField,
  EnvField,
  EnvSchema,
  EnumField,
  NumberField,
  PortField,
  SecretField,
  StringField,
  UuidField,
} from "./types.js";

type EnumValues = readonly string[];

export class SchemaBuilder {
  private readonly schema: EnvSchema = {};

  string(key: string, config: Omit<StringField, "type"> = {}): this {
    this.schema[key] = { type: "string", ...config };
    return this;
  }

  number(key: string, config: Omit<NumberField, "type"> = {}): this {
    this.schema[key] = { type: "number", ...config };
    return this;
  }

  boolean(key: string, config: Omit<BooleanField, "type"> = {}): this {
    this.schema[key] = { type: "boolean", ...config };
    return this;
  }

  port(key: string, config: Omit<PortField, "type"> = {}): this {
    this.schema[key] = { type: "port", default: 3000, ...config };
    return this;
  }

  duration(key: string, config: Omit<DurationField, "type"> = {}): this {
    this.schema[key] = { type: "duration", ...config };
    return this;
  }

  uuid(key: string, config: Omit<UuidField, "type"> = {}): this {
    this.schema[key] = { type: "uuid", ...config };
    return this;
  }

  secret(key: string, config: Omit<SecretField, "type"> = {}): this {
    this.schema[key] = { type: "secret", required: true, ...config };
    return this;
  }

  enum<const T extends EnumValues>(key: string, values: T, config: Omit<EnumField<T>, "type" | "values"> = {}): this {
    this.schema[key] = { type: "enum", values, ...config } as EnvField;
    return this;
  }

  add(key: string, fieldDef: EnvField): this {
    this.schema[key] = fieldDef;
    return this;
  }

  extend(extra: EnvSchema): this {
    Object.assign(this.schema, extra);
    return this;
  }

  build(): EnvSchema {
    return { ...this.schema };
  }
}

export function createSchemaBuilder(): SchemaBuilder {
  return new SchemaBuilder();
}
