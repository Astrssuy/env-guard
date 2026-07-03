# env-guard

Valida variables de entorno al arrancar tu app con errores claros y tipado en TypeScript.

Deja de descubrir `.env` mal configurados en producción. **env-guard** revisa todas las variables cuando tu app inicia y te dice exactamente qué falta o qué está mal.

[![CI](https://github.com/Astrssuy/env-guard/actions/workflows/ci.yml/badge.svg)](https://github.com/Astrssuy/env-guard/actions/workflows/ci.yml)

## ¿Por qué usarlo?

| Sin env-guard | Con env-guard |
|---------------|---------------|
| La app arranca y falla en la primera petición | La app no arranca y muestra un error claro |
| `PORT=abc` causa errores crípticos | `PORT: must be a number, got "abc"` |
| `DATABASE_URL` ausente → `undefined` | `DATABASE_URL: is required` |
| Arreglas un problema por deploy | Ves todos los problemas de una vez |

## Para equipos profesionales

env-guard está pensado para **producción**, **CI/CD** y **equipos** que necesitan config confiable sin montar un stack pesado.

| Necesidad | Solución en env-guard |
|-----------|------------------------|
| Variables solo en producción | `requiredWhen: (env) => env.NODE_ENV === "production"` |
| Detectar typos en `.env` | `strict: true` — falla si hay variables desconocidas |
| No filtrar secretos en logs | `redactForLogging()`, tipo `secret`, `toStructuredLog()` |
| Validar en CI antes del deploy | `checkEnv()` → exit code 0/1 |
| Documentación para el equipo | `exportSchemaMarkdown()` → tabla en Markdown |
| Config singleton al arrancar | `createValidatedEnvModule()` — valida una vez, cachea |
| Depurar staging sin crash | `envDiff()` + `formatEnvReport()` |

### vs Zod / envalid / t3-env

| | env-guard | Zod + manual | envalid | t3-env |
|---|-----------|--------------|---------|--------|
| Hecho para `process.env` | ✅ | ⚠️ manual | ✅ | ✅ Next.js |
| Sin dependencias runtime | ✅ | ❌ Zod | ✅ | ⚠️ |
| Presets (`server`, `auth`…) | ✅ | ❌ | ❌ | ❌ |
| `.env` nativo sin dotenv | ✅ | ❌ | ❌ | ⚠️ |
| Modo strict (typos) | ✅ | ❌ | ❌ | ❌ |
| `requiredWhen` / condicional | ✅ | ⚠️ manual | ❌ | ⚠️ |

**Cuándo elegir env-guard:** backend Node, APIs, microservicios, equipos que quieren algo **ligero, tipado y listo para CI** sin acoplarse a Next.js ni aprender otro schema language.

### CI/CD (GitHub Actions)

```yaml
- name: Validate environment
  run: npm run check:env
```

```ts
// scripts/check-env.ts
import { checkEnv, mergeSchemas, presets } from "env-guard";

process.exit(checkEnv(mergeSchemas([presets.server, presets.database]), {
  envFiles: [".env"],
  strict: true,
}));
```

### Producción segura

```ts
import { createValidatedEnvModule, redactForLogging, field } from "env-guard";

export const configModule = createValidatedEnvModule(schema, {
  envFiles: [".env", ".env.local"],
  strict: true,
  onDeprecated: (key, msg) => console.warn(`[env] ${key}: ${msg}`),
});

// En logs / health checks — NUNCA loguees config crudo
console.log("Config:", redactForLogging(configModule.get(), schema));
```

Ver [`examples/production.ts`](./examples/production.ts) y [`examples/express.ts`](./examples/express.ts).

## Instalación

```bash
npm install env-guard
```

## Inicio rápido

Crea un archivo `env.ts` en tu proyecto:

```ts
import { env } from "env-guard";

export const config = env({
  PORT: { type: "number", default: 3000 },
  DATABASE_URL: { type: "string", required: true },
  NODE_ENV: {
    type: "enum",
    values: ["development", "production", "test"] as const,
  },
  DEBUG: { type: "boolean", default: false },
});
```

Úsalo al arrancar:

```ts
import { config } from "./env.js";

console.log(`Server on port ${config.PORT}`);
```

Si algo falla, la app lanza un error legible:

```
Environment validation failed:
  - DATABASE_URL: is required
  - PORT: must be a number, got "abc"
  - NODE_ENV: must be one of [development, production, test], got "staging"
```

## Tipos soportados

### `string`

```ts
API_KEY: { type: "string", required: true }
SECRET: { type: "string", minLength: 16, maxLength: 64 }
TOKEN: { type: "string", pattern: "^sk_" }
```

- Las cadenas vacías cuentan como ausentes.
- Por defecto se hace `.trim()` (desactiva con `trim: false`).

### `number`

```ts
PORT: { type: "number", default: 8080 }
WORKERS: { type: "number", min: 1, max: 16, integer: true }
```

- Rechaza `NaN` y valores no numéricos.
- `integer: true` exige números enteros.

### `boolean`

```ts
DEBUG: { type: "boolean", default: false }
```

Valores aceptados: `true/false`, `1/0`, `yes/no`, `on/off` (sin importar mayúsculas).

### `enum`

```ts
NODE_ENV: {
  type: "enum",
  values: ["development", "production", "test"] as const,
}
```

El valor debe coincidir exactamente con uno de la lista.

### `url`

```ts
DATABASE_URL: { type: "url", required: true, protocols: ["postgres"] }
APP_URL: { type: "url", default: "http://localhost:3000" }
```

Valida que sea una URL válida y, opcionalmente, restringe el protocolo.

### `array`

```ts
ALLOWED_ORIGINS: {
  type: "array",
  minItems: 1,
  separator: ",", // por defecto
}
```

Parsea listas separadas por comas: `"http://a.com, http://b.com"` → `["http://a.com", "http://b.com"]`.

### `email`

```ts
ADMIN_EMAIL: { type: "email", required: true }
```

Valida formato de correo electrónico.

### `json`

```ts
FEATURE_FLAGS: { type: "json", default: { beta: false } }
```

Parsea valores JSON desde strings de entorno.

### `port`

```ts
PORT: { type: "port", default: 3000 }
```

Atajo para puertos TCP válidos (entero entre 1 y 65535).

### `duration`

```ts
TIMEOUT: { type: "duration", default: 30000 }
CACHE_TTL: { type: "duration" }  // "30s", "5m", "1h", "2d"
```

Convierte duraciones legibles a milisegundos.

### `uuid`

```ts
INSTANCE_ID: { type: "uuid", required: true }
```

Valida formato UUID v4.

### `secret`

```ts
API_KEY: { type: "secret", minLength: 32 }
```

Para claves sensibles. Los errores enmascaran el valor (`ab****cd`).

### `integer`

```ts
WORKERS: { type: "integer", min: 1, max: 16 }
```

Enteros sin decimales, alternativa clara a `number` + `integer: true`.

### Descripciones y validación custom

Todos los tipos aceptan `description` y `validate`:

```ts
API_KEY: {
  type: "string",
  required: true,
  description: "Clave secreta del panel de admin",
  validate: (value) =>
    typeof value === "string" && value.startsWith("sk_")
      ? undefined
      : "must start with sk_",
}
```

## Opciones

### Prefijo de variables

Útil cuando todas tus variables llevan un prefijo común:

```ts
const config = env(
  {
    PORT: { type: "number", default: 3000 },
    DEBUG: { type: "boolean", default: false },
  },
  { prefix: "APP_" }, // lee APP_PORT y APP_DEBUG
);
```

### Fuente personalizada (testing)

Pasa un objeto en lugar de `process.env`:

```ts
const config = env(
  { API_KEY: { type: "string", required: true } },
  { source: { API_KEY: "test-key" } },
);
```

Ideal para tests con Vitest, Jest, etc.

### Cargar archivo `.env`

Sin dependencias externas:

```ts
import { env, loadEnvFile } from "env-guard";

const config = env(schema, {
  source: { ...process.env, ...loadEnvFile(".env") },
});
```

### Utilidades de schema

```ts
import { mergeSchemas, pickSchema, omitSchema } from "env-guard";

const serverSchema = mergeSchemas(baseSchema, dbSchema);
const publicConfig = pickSchema(schema, ["PORT", "NODE_ENV"]);
const withoutSecrets = omitSchema(schema, ["API_KEY"]);
```

### Presets y field helpers

Atajos para schemas comunes:

```ts
import { field, presets, mergeSchemas, defineSchema } from "env-guard";

const schema = defineSchema(
  mergeSchemas([presets.server, presets.database, presets.auth]),
);

// O campo a campo:
const custom = defineSchema({
  PORT: field.port(),
  NODE_ENV: field.nodeEnv(),
  LOG_LEVEL: field.logLevel(),
  DATABASE_URL: field.databaseUrl(),
  JWT_SECRET: field.secret({ minLength: 32 }),
});
```

### SchemaBuilder (API fluida)

```ts
import { createSchemaBuilder } from "env-guard";

const schema = createSchemaBuilder()
  .string("API_KEY", { required: true })
  .port("PORT")
  .duration("TIMEOUT", { default: 30_000 })
  .uuid("INSTANCE_ID")
  .build();
```

### createEnvLoader

Factory reutilizable con archivos `.env`:

```ts
import { createEnvLoader, presets, mergeSchemas } from "env-guard";

const loadConfig = createEnvLoader({
  envFiles: [".env", ".env.local"],
  prefix: "APP_",
  onDeprecated: (key, msg) => console.warn(`${key}: ${msg}`),
});

export const config = loadConfig.load(mergeSchemas([presets.server, presets.database]));
```

### envDiff (depuración)

Inspecciona el entorno sin lanzar error:

```ts
import { envDiff } from "env-guard";

const report = envDiff(schema, { source: process.env });
console.log("Missing:", report.missing);
console.log("Invalid:", report.invalid);
```

### transform, envKey y deprecated

```ts
{
  port: { type: "port", envKey: "SERVER_PORT" },       // lee SERVER_PORT
  tags: { type: "string", transform: (v) => String(v).toUpperCase() },
  OLD_KEY: { type: "string", deprecated: "Use NEW_KEY" },
}
```

## API

### `env(schema, options?)`

Valida y devuelve un objeto tipado. Lanza `EnvValidationError` si algo falla.

| Opción | Tipo | Descripción |
|--------|------|-------------|
| `source` | `Record<string, string \| undefined>` | Fuente de variables (default: `process.env`) |
| `prefix` | `string` | Prefijo para los nombres en el entorno |
| `envFiles` | `string[]` | Carga automática de archivos `.env` |
| `onValidationError` | `(error) => void` | Callback antes de fallar |
| `onDeprecated` | `(key, message) => void` | Aviso de variables deprecadas |

### `envDiff(schema, options?)`

Devuelve `{ valid, issues, missing, invalid, present }` sin lanzar error.

### `checkEnv(schema, options?)`

Para CI: retorna `0` si válido, `1` si falla. Usar con `process.exit(checkEnv(...))`.

### `validateEnvFiles(schema, paths, options?)`

Valida archivos `.env` sin arrancar la aplicación.

### `createValidatedEnvModule(schema, options?)`

Singleton que valida una vez al boot y cachea el resultado (`.get()`, `.reload()`).

### `redactForLogging(data, schema)` / `redactSourceForLogging(source)`

Enmascara secretos antes de loguear config o variables crudas.

### `exportSchemaMarkdown(schema, options?)`

Genera tabla Markdown para documentación del equipo.

### `formatEnvReport(diff)`

Reporte legible para ops / debugging.

### `requiredWhen` / `skipWhen` / `strict`

```ts
SENTRY_DSN: field.url({
  requiredWhen: (env) => env.NODE_ENV === "production",
}),
LEGACY: field.string({ skipWhen: (env) => env.USE_V2 === "true" }),
// options: { strict: true } — falla si hay variables desconocidas
```

### `createEnvLoader(options?)`

Factory con `.load()` y `.safeLoad()` reutilizables.

### `field` / `presets`

Helpers para definir campos y grupos predefinidos (`server`, `database`, `auth`, `cache`).

### `createSchemaBuilder()`

API fluida para construir schemas paso a paso.

### `defineSchema(schema)`

Helper tipado para inferencia estricta del schema.

### `maskSecret(value)`

Enmascara secretos para logs seguros.

### `safeEnv(schema, options?)`

Igual que `env`, pero **no lanza error**. Devuelve:

```ts
// Éxito
{ success: true, data: { PORT: 3000, ... } }

// Fallo
{ success: false, error: EnvValidationError }
```

```ts
import { safeEnv } from "env-guard";

const result = safeEnv({ PORT: { type: "number" } });

if (!result.success) {
  console.error(result.error.message);
  process.exit(1);
}

console.log(result.data.PORT);
```

### `generateEnvExample(schema, options?)`

Genera contenido para un archivo `.env.example`:

```ts
import { writeFileSync } from "node:fs";
import { generateEnvExample } from "env-guard";

const schema = {
  PORT: { type: "number", default: 3000 },
  DATABASE_URL: { type: "url", required: true },
};

writeFileSync(".env.example", generateEnvExample(schema, { prefix: "APP_" }));
```

Salida:

```env
# PORT (optional)
APP_PORT=3000

# DATABASE_URL (required)
APP_DATABASE_URL=https://example.com
```

### `loadEnvFile(path)` / `parseEnvContent(content)`

Lee y parsea archivos `.env` nativamente.

### `mergeSchemas(a, b)` / `pickSchema(schema, keys)` / `omitSchema(schema, keys)`

Combina y filtra schemas reutilizables.

### `assertEnv(schema, options?)`

Alias de `env()` para uso en scripts de arranque.

### `formatIssues(issues)`

Formatea errores como texto legible.

### `VERSION`

Constante con la versión actual del paquete.

### `EnvValidationError`

Error con la propiedad `.issues` para acceso programático:

```ts
try {
  env({ PORT: { type: "number" } }, { source: { PORT: "nope" } });
} catch (error) {
  if (error instanceof EnvValidationError) {
    console.error(error.toJSON()); // logging estructurado
    for (const issue of error.issues) {
      console.error(`${issue.key}: ${issue.message}`);
    }
  }
}
```

Ver también [`examples/basic.ts`](./examples/basic.ts) y [`CHANGELOG.md`](./CHANGELOG.md).

## Ejemplo completo (Express)

```ts
// env.ts
import { env } from "env-guard";

export const config = env({
  PORT: { type: "number", default: 3000 },
  DATABASE_URL: { type: "url", required: true, protocols: ["postgres"] },
  CORS_ORIGINS: { type: "array", default: ["http://localhost:3000"] },
  NODE_ENV: {
    type: "enum",
    values: ["development", "production"] as const,
    default: "development",
  },
});

// server.ts
import express from "express";
import { config } from "./env.js";

const app = express();
app.listen(config.PORT, () => {
  console.log(`Running in ${config.NODE_ENV} on port ${config.PORT}`);
});
```

## Estructura del proyecto

```
env-guard/
├── src/
│   ├── index.ts      # API pública
│   ├── parsers.ts    # Lógica de parseo por tipo
│   ├── types.ts      # Tipos TypeScript y EnvValidationError
│   ├── helpers.ts    # Utilidades y carga de .env
│   └── version.ts    # Versión del paquete
├── tests/            # 47 tests con Vitest (7 archivos)
├── examples/
│   ├── basic.ts      # Uso básico
│   ├── presets.ts    # Presets y loader
│   └── debug-env.ts  # envDiff para depurar
├── CHANGELOG.md
├── .github/
│   └── workflows/
│       └── ci.yml    # CI en Node 18, 20 y 22
├── package.json
├── tsconfig.json
└── README.md
```

## Desarrollo local

Requisitos: Node.js >= 18

```bash
git clone https://github.com/Astrssuy/env-guard.git
cd env-guard
npm install
npm test        # ejecutar tests
npm run build   # compilar a dist/
```

### Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `npm test` | Ejecuta la suite de tests |
| `npm run test:watch` | Tests en modo watch |
| `npm run build` | Compila TypeScript a `dist/` |

## CI

Cada push y pull request ejecuta tests y build en Node 18, 20 y 22 via GitHub Actions.

## Licencia

MIT — ver [LICENSE](./LICENSE).
