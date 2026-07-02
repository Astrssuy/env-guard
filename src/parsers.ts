import { isEmpty } from "./helpers.js";
import type {
  ArrayField,
  BooleanField,
  EnumField,
  NumberField,
  StringField,
  UrlField,
} from "./types.js";

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

function assertNumberConstraints(value: number, field: NumberField): void {
  if (field.integer && !Number.isInteger(value)) {
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
