export type EnvSource = Record<string, string | undefined>;

export interface FieldCommon {
  required?: boolean;
  description?: string;
  validate?: (value: unknown) => string | void;
  transform?: (value: unknown) => unknown;
  envKey?: string;
  deprecated?: string | boolean;
}

export interface StringField extends FieldCommon {
  type: "string";
  default?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp | string;
  trim?: boolean;
}

export interface NumberField extends FieldCommon {
  type: "number";
  default?: number;
  min?: number;
  max?: number;
  integer?: boolean;
}

export interface IntegerField extends FieldCommon {
  type: "integer";
  default?: number;
  min?: number;
  max?: number;
}

export interface BooleanField extends FieldCommon {
  type: "boolean";
  default?: boolean;
}

export interface EnumField<T extends readonly string[]> extends FieldCommon {
  type: "enum";
  values: T;
  default?: T[number];
}

export interface UrlField extends FieldCommon {
  type: "url";
  default?: string;
  protocols?: readonly string[];
}

export interface ArrayField extends FieldCommon {
  type: "array";
  default?: string[];
  separator?: string;
  minItems?: number;
  maxItems?: number;
}

export interface EmailField extends FieldCommon {
  type: "email";
  default?: string;
}

export interface JsonField extends FieldCommon {
  type: "json";
  default?: unknown;
}

export interface PortField extends FieldCommon {
  type: "port";
  default?: number;
}

export interface DurationField extends FieldCommon {
  type: "duration";
  default?: number;
  unit?: "ms" | "s" | "m" | "h" | "d";
}

export interface UuidField extends FieldCommon {
  type: "uuid";
  default?: string;
}

export interface SecretField extends FieldCommon {
  type: "secret";
  default?: string;
  minLength?: number;
}

export type EnvField =
  | StringField
  | NumberField
  | IntegerField
  | BooleanField
  | EnumField<readonly string[]>
  | UrlField
  | ArrayField
  | EmailField
  | JsonField
  | PortField
  | DurationField
  | UuidField
  | SecretField;

export type EnvSchema = Record<string, EnvField>;

type InferField<T extends EnvField> = T extends StringField
  ? string
  : T extends NumberField
    ? number
    : T extends IntegerField
      ? number
      : T extends BooleanField
        ? boolean
        : T extends EnumField<infer V>
          ? V[number]
          : T extends UrlField
            ? string
            : T extends ArrayField
              ? string[]
              : T extends EmailField
                ? string
                : T extends JsonField
                  ? unknown
                  : T extends PortField
                    ? number
                    : T extends DurationField
                      ? number
                      : T extends UuidField
                        ? string
                        : T extends SecretField
                          ? string
                          : never;

export type InferEnv<T extends EnvSchema> = {
  [K in keyof T]: InferField<T[K]>;
};

export interface EnvValidationIssue {
  key: string;
  message: string;
  description?: string;
}

export interface EnvOptions {
  source?: EnvSource;
  prefix?: string;
  envFiles?: string[];
  onValidationError?: (error: EnvValidationError) => void;
  onDeprecated?: (key: string, message: string) => void;
}

export type SafeEnvResult<T extends EnvSchema> =
  | { success: true; data: InferEnv<T> }
  | { success: false; error: EnvValidationError };

export interface EnvDiffResult {
  valid: boolean;
  issues: EnvValidationIssue[];
  missing: string[];
  invalid: string[];
  present: string[];
}

export function formatIssues(issues: EnvValidationIssue[]): string {
  return issues
    .map((issue) => {
      const label = issue.description ? `${issue.key} (${issue.description})` : issue.key;
      return `  - ${label}: ${issue.message}`;
    })
    .join("\n");
}

export class EnvValidationError extends Error {
  readonly issues: EnvValidationIssue[];

  constructor(issues: EnvValidationIssue[]) {
    super(`Environment validation failed:\n${formatIssues(issues)}`);
    this.name = "EnvValidationError";
    this.issues = issues;
  }

  toJSON(): { name: string; message: string; issues: EnvValidationIssue[] } {
    return {
      name: this.name,
      message: this.message,
      issues: this.issues,
    };
  }
}

export function defineSchema<const T extends EnvSchema>(schema: T): T {
  return schema;
}
