import type { BooleanField, EnumField, NumberField, StringField, UrlField } from "./types.js";

function isEmpty(value: string | undefined): value is undefined | "" {
  return value === undefined || value === "";
}

export function parseString(key: string, raw: string | undefined, field: StringField): string {
  if (isEmpty(raw)) {
    if (field.default !== undefined) return field.default;
    if (field.required !== false) {
      throw new Error("is required");
    }
    return "";
  }
  return raw;
}

export function parseNumber(key: string, raw: string | undefined, field: NumberField): number {
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
  return value;
}

const TRUTHY = new Set(["true", "1", "yes", "on"]);
const FALSY = new Set(["false", "0", "no", "off"]);

export function parseBoolean(key: string, raw: string | undefined, field: BooleanField): boolean {
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
  key: string,
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

export function parseUrl(key: string, raw: string | undefined, field: UrlField): string {
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
