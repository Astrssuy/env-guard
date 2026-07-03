# Changelog

All notable changes to this project will be documented in this file.

## [0.5.0] - 2026-07-02

### Added (professional / production)
- `requiredWhen` — variables obligatorias solo en ciertos entornos
- `skipWhen` — omitir campos según condición
- `strict` — detectar variables desconocidas (typos en `.env`)
- `checkEnv()` — exit code 0/1 para CI
- `validateEnvFiles()` — validar archivos `.env` sin arrancar la app
- `createValidatedEnvModule()` — singleton cacheado al boot
- `redactForLogging()` / `redactSourceForLogging()` — logs seguros
- `exportSchemaMarkdown()` — documentación auto-generada
- `formatEnvReport()` — reporte legible para ops
- `EnvValidationError.toStructuredLog()` — integración con observabilidad
- Script CI: `scripts/check-env.ts` + `npm run check:env`
- Examples: `production.ts`, `express.ts`

## [0.4.0] - 2026-07-02

### Added
- Types: `duration`, `uuid`, `secret`, `integer`
- Field options: `transform`, `envKey`, `deprecated`
- `envDiff()` to inspect missing/invalid variables without throwing
- `createEnvLoader()` factory with multi-file `.env` support
- `envFiles` option on `env()` and `safeEnv()`
- `field` helpers and `presets` (server, database, auth, cache)
- `SchemaBuilder` fluent API
- `defineSchema()`, `extendSchema()`, `getSchemaEnvKeys()`, `maskSecret()`
- `loadEnvFiles()` for multiple env files
- Variadic `mergeSchemas([a, b, c])`
- `validate.ts` internal module refactor
- Examples: `presets.ts`, `debug-env.ts`
- 47 tests across 7 test files

## [0.3.0] - 2026-07-02

### Added
- `email` type for email address validation
- `json` type for parsing JSON environment values
- `port` type (integer between 1 and 65535)
- `description` field on all schema types for clearer errors
- `validate` callback for custom validation logic
- `formatIssues()` utility for readable error formatting
- `EnvValidationError.toJSON()` for structured logging
- `mergeSchemas()`, `pickSchema()`, `omitSchema()` utilities
- `loadEnvFile()` and `parseEnvContent()` for native `.env` parsing
- `assertEnv()` as alias for `env()`
- `onValidationError` callback option
- `VERSION` constant export
- Split test suites and `examples/basic.ts`

## [0.2.0] - 2026-07-01

### Added
- String constraints: `minLength`, `maxLength`, `pattern`, `trim`
- Number constraints: `min`, `max`, `integer`
- `array` type for comma-separated lists
- `prefix` option for prefixed environment variables
- `generateEnvExample()` helper
- Comprehensive Spanish README

## [0.1.0] - 2026-07-01

### Added
- Initial release with `string`, `number`, `boolean`, `enum`, `url` types
- `env()` and `safeEnv()` functions
- `EnvValidationError` with aggregated issues
- Full TypeScript inference
