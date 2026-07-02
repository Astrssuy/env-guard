# env-guard

Validate environment variables at startup with clear, actionable errors.

Stop discovering misconfigured `.env` files in production. **env-guard** checks all variables when your app boots and tells you exactly what is missing or invalid.

## Problem

| Without env-guard | With env-guard |
|-------------------|----------------|
| App starts, crashes on first request | App refuses to start with a clear error |
| `PORT=abc` causes cryptic failures | `PORT: must be a number, got "abc"` |
| Missing `DATABASE_URL` surfaces as `undefined` | `DATABASE_URL: is required` |
| Fix issues one deploy at a time | See all problems in one message |

## Install

```bash
npm install env-guard
```

## Usage

```ts
import { env } from "env-guard";

const config = env({
  PORT: { type: "number", default: 3000 },
  DATABASE_URL: { type: "string", required: true },
  NODE_ENV: {
    type: "enum",
    values: ["development", "production", "test"] as const,
  },
  DEBUG: { type: "boolean", default: false },
});

// config.PORT → number
// config.DATABASE_URL → string
// config.NODE_ENV → "development" | "production" | "test"
// config.DEBUG → boolean
```

If validation fails, you get an `EnvValidationError` with every issue at once:

```
Environment validation failed:
  - DATABASE_URL: is required
  - PORT: must be a number, got "abc"
  - NODE_ENV: must be one of [development, production, test], got "staging"
```

## Supported types

| Type | Example | Notes |
|------|---------|-------|
| `string` | `{ type: "string", required: true }` | Empty string counts as missing |
| `number` | `{ type: "number", default: 8080 }` | Rejects `NaN` and non-numeric values |
| `boolean` | `{ type: "boolean", default: false }` | Accepts `true/false`, `1/0`, `yes/no`, `on/off` |
| `enum` | `{ type: "enum", values: ["a", "b"] as const }` | Value must match exactly |

## Testing

Pass a custom `source` instead of `process.env`:

```ts
const config = env(
  { API_KEY: { type: "string", required: true } },
  { source: { API_KEY: "test-key" } },
);
```

## API

### `env(schema, options?)`

- **schema** — object describing each environment variable
- **options.source** — optional record to read from (defaults to `process.env`)

Returns a typed object inferred from your schema.

### `EnvValidationError`

Thrown when one or more variables fail validation. Check `.issues` for structured errors:

```ts
try {
  env({ PORT: { type: "number" } }, { source: { PORT: "nope" } });
} catch (error) {
  if (error instanceof EnvValidationError) {
    console.error(error.issues);
  }
}
```

## Development

```bash
npm install
npm test
npm run build
```

## License

MIT
