export type EnvSource = Record<string, string | undefined>;

export interface StringField {
  type: "string";
  required?: boolean;
  default?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp | string;
  trim?: boolean;
}

export interface NumberField {
  type: "number";
  required?: boolean;
  default?: number;
  min?: number;
  max?: number;
  integer?: boolean;
}

export interface BooleanField {
  type: "boolean";
  required?: boolean;
  default?: boolean;
}

export interface EnumField<T extends readonly string[]> {
  type: "enum";
  values: T;
  required?: boolean;
  default?: T[number];
}

export interface UrlField {
  type: "url";
  required?: boolean;
  default?: string;
  protocols?: readonly string[];
}

export interface ArrayField {
  type: "array";
  required?: boolean;
  default?: string[];
  separator?: string;
  minItems?: number;
  maxItems?: number;
}

export type EnvField =
  | StringField
  | NumberField
  | BooleanField
  | EnumField<readonly string[]>
  | UrlField
  | ArrayField;

export type EnvSchema = Record<string, EnvField>;

type InferField<T extends EnvField> = T extends StringField
  ? string
  : T extends NumberField
    ? number
    : T extends BooleanField
      ? boolean
      : T extends EnumField<infer V>
        ? V[number]
        : T extends UrlField
          ? string
          : T extends ArrayField
            ? string[]
            : never;

export type InferEnv<T extends EnvSchema> = {
  [K in keyof T]: InferField<T[K]>;
};

export interface EnvValidationIssue {
  key: string;
  message: string;
}

export class EnvValidationError extends Error {
  readonly issues: EnvValidationIssue[];

  constructor(issues: EnvValidationIssue[]) {
    const summary = issues.map((issue) => `  - ${issue.key}: ${issue.message}`).join("\n");
    super(`Environment validation failed:\n${summary}`);
    this.name = "EnvValidationError";
    this.issues = issues;
  }
}
