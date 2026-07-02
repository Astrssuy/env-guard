import { isEmpty, maskSecret } from "./helpers.js";
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DURATION_PATTERN = /^(\d+(?:\.\d+)?)(ms|s|m|h|d)$/i;

const DURATION_MULTIPLIERS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

function assertStringConstraints(value: string, field: StringField): void {
  if (field.minLength !== undefined && value.length < field.minLength) {
    throw new Error(`must be at least ${field.minLength} characters, got ${value.length}`);
  }

  if (field.maxLength !== undefined && value.length > field.maxLength) {
    throw new Error(`must be at most ${field.maxLength} characters, got ${value.length}`);
  }

  if (field.pattern !== undefined) {
    const regex =
      typeof field.pattern === "string" ? new RegExp(field.pattern) : field.pattern;
    if (!regex.test(value)) {
      throw new Error(`must match pattern ${regex}`);
    }
  }
}

function assertNumberConstraints(value: number, field: NumberField | IntegerField): void {
  if ("integer" in field && field.integer && !Number.isInteger(value)) {
    throw new Error(`must be an integer, got "${value}"`);
  }

  if (field.type === "integer" && !Number.isInteger(value)) {
    throw new Error(`must be an integer, got "${value}"`);
  }

  if (field.min !== undefined && value < field.min) {
    throw new Error(`must be >= ${field.min}, got "${value}"`);
  }

  if (field.max !== undefined && value > field.max) {
    throw new Error(`must be <= ${field.max}, got "${value}"`);
  }
}

export function parseString(_key: string, raw: string | undefined, field: StringField): string {
  if (isEmpty(raw)) {
    if (field.default !== undefined) return field.default;
    if (field.required !== false) {
      throw new Error("is required");
    }
    return "";
  }

  const value = field.trim === false ? raw : raw.trim();
  if (value === "" && field.required !== false && field.default === undefined) {
    throw new Error("is required");
  }
  assertStringConstraints(value, field);
  return value;
}

export function parseNumber(_key: string, raw: string | undefined, field: NumberField): number {
  if (isEmpty(raw)) {
    if (field.default !== undefined) return field.default;
    if (field.required !== false) {
      throw new Error("is required");
    }
    return 0;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`must be a number, got "${raw}"`);
  }

  assertNumberConstraints(value, field);
  return value;
}

export function parseInteger(_key: string, raw: string | undefined, field: IntegerField): number {
  return parseNumber(_key, raw, { ...field, type: "number", integer: true });
}

export function parsePort(_key: string, raw: string | undefined, field: PortField): number {
  return parseNumber(_key, raw, {
    ...field,
    type: "number",
    min: 1,
    max: 65535,
    integer: true,
  });
}

const TRUTHY = new Set(["true", "1", "yes", "on"]);
const FALSY = new Set(["false", "0", "no", "off"]);

export function parseBoolean(_key: string, raw: string | undefined, field: BooleanField): boolean {
  if (isEmpty(raw)) {
    if (field.default !== undefined) return field.default;
    if (field.required !== false) {
      throw new Error("is required");
    }
    return false;
  }

  const normalized = raw.trim().toLowerCase();
  if (TRUTHY.has(normalized)) return true;
  if (FALSY.has(normalized)) return false;

  throw new Error(`must be a boolean, got "${raw}"`);
}

export function parseEnum<T extends readonly string[]>(
  _key: string,
  raw: string | undefined,
  field: EnumField<T>,
): T[number] {
  if (isEmpty(raw)) {
    if (field.default !== undefined) return field.default;
    if (field.required !== false) {
      throw new Error("is required");
    }
    return field.values[0];
  }

  if (!field.values.includes(raw)) {
    throw new Error(`must be one of [${field.values.join(", ")}], got "${raw}"`);
  }

  return raw as T[number];
}

export function parseUrl(_key: string, raw: string | undefined, field: UrlField): string {
  if (isEmpty(raw)) {
    if (field.default !== undefined) return field.default;
    if (field.required !== false) {
      throw new Error("is required");
    }
    return "";
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`must be a valid URL, got "${raw}"`);
  }

  if (field.protocols && !field.protocols.includes(parsed.protocol.replace(":", ""))) {
    throw new Error(
      `must use protocol [${field.protocols.join(", ")}], got "${parsed.protocol.replace(":", "")}"`,
    );
  }

  return raw;
}

export function parseEmail(_key: string, raw: string | undefined, field: EmailField): string {
  const value = parseString(_key, raw, { ...field, type: "string" });

  if (value !== "" && !EMAIL_PATTERN.test(value)) {
    throw new Error(`must be a valid email, got "${value}"`);
  }

  return value;
}

export function parseJson(_key: string, raw: string | undefined, field: JsonField): unknown {
  if (isEmpty(raw)) {
    if (field.default !== undefined) return field.default;
    if (field.required !== false) {
      throw new Error("is required");
    }
    return undefined;
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`must be valid JSON, got "${raw}"`);
  }
}

export function parseArray(_key: string, raw: string | undefined, field: ArrayField): string[] {
  if (isEmpty(raw)) {
    if (field.default !== undefined) return field.default;
    if (field.required !== false) {
      throw new Error("is required");
    }
    return [];
  }

  const separator = field.separator ?? ",";
  const items = raw
    .split(separator)
    .map((item) => item.trim())
    .filter((item) => item !== "");

  if (field.minItems !== undefined && items.length < field.minItems) {
    throw new Error(`must contain at least ${field.minItems} items, got ${items.length}`);
  }

  if (field.maxItems !== undefined && items.length > field.maxItems) {
    throw new Error(`must contain at most ${field.maxItems} items, got ${items.length}`);
  }

  return items;
}

export function parseDuration(
  _key: string,
  raw: string | undefined,
  field: DurationField,
): number {
  if (isEmpty(raw)) {
    if (field.default !== undefined) return field.default;
    if (field.required !== false) {
      throw new Error("is required");
    }
    return 0;
  }

  const match = raw.trim().match(DURATION_PATTERN);
  if (!match) {
    throw new Error(`must be a duration like 30s, 5m, 1h, got "${raw}"`);
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier = DURATION_MULTIPLIERS[unit];

  if (!Number.isFinite(amount) || multiplier === undefined) {
    throw new Error(`must be a valid duration, got "${raw}"`);
  }

  return Math.round(amount * multiplier);
}

export function parseUuid(_key: string, raw: string | undefined, field: UuidField): string {
  const value = parseString(_key, raw, { ...field, type: "string" });

  if (value !== "" && !UUID_PATTERN.test(value)) {
    throw new Error(`must be a valid UUID, got "${value}"`);
  }

  return value;
}

export function parseSecret(_key: string, raw: string | undefined, field: SecretField): string {
  if (isEmpty(raw)) {
    if (field.default !== undefined) return field.default;
    if (field.required !== false) {
      throw new Error("is required");
    }
    return "";
  }

  const value = raw.trim();
  if (value === "" && field.required !== false && field.default === undefined) {
    throw new Error("is required");
  }

  if (field.minLength !== undefined && value.length < field.minLength) {
    throw new Error(
      `must be at least ${field.minLength} characters, got ${maskSecret(value)}`,
    );
  }

  return value;
}

export function runCustomValidate(value: unknown, validate?: (value: unknown) => string | void): void {
  if (!validate) return;

  const result = validate(value);
  if (typeof result === "string" && result.length > 0) {
    throw new Error(result);
  }
}

export function applyTransform(value: unknown, transform?: (value: unknown) => unknown): unknown {
  if (!transform) return value;
  return transform(value);
}

export function getDeprecatedMessage(deprecated: string | boolean | undefined): string | null {
  if (!deprecated) return null;
  if (typeof deprecated === "string") return deprecated;
  return "This variable is deprecated";
}
