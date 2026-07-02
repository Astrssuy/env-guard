# Changelog

All notable changes to this project will be documented in this file.

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
