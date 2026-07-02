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

## API

### `env(schema, options?)`

Valida y devuelve un objeto tipado. Lanza `EnvValidationError` si algo falla.

| Opción | Tipo | Descripción |
|--------|------|-------------|
| `source` | `Record<string, string \| undefined>` | Fuente de variables (default: `process.env`) |
| `prefix` | `string` | Prefijo para los nombres en el entorno |
| `onValidationError` | `(error: EnvValidationError) => void` | Callback antes de fallar |

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
├── tests/            # 33 tests con Vitest
├── examples/
│   └── basic.ts      # Ejemplo de uso
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
