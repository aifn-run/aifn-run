# aifn.run

Versioned AI functions for JavaScript. Define a prompt once, choose predictable
JSON or text output, and call the active version over HTTP.

## Current Architecture

- The website is a static Li3 application using browser-native modules.
- The server is a TypeScript HTTP server bundled with esbuild.
- The container starts `package.json`'s `main` entrypoint and listens on `PORT`.
- Function data is stored in the remote SQLite service configured by
  `DATABASE_URL`.
- Authentication continues through `auth.aifn.run` and the incoming session
  cookie.
- OpenAPI is served as raw JSON or YAML from `/api`.

## Repository Map

```text
.
├── web/
│   ├── index.html                  Li3 website shell
│   ├── app.js                      Li3 bootstrap and template loading
│   ├── styles.css                  Responsive visual system
│   └── components/                 Website and editor templates
├── server/index.ts                 TypeScript HTTP server and API routes
├── openapi/openapi.yaml            Canonical API contract
├── openapi/openapi.json            JSON API contract
├── Dockerfile                      Production container
├── tsconfig.json                   TypeScript checking configuration
├── package.json                    Build and runtime configuration
└── package.json                    Build and runtime configuration
```

## Development

```sh
npm ci
npm run build
npx tsc --noEmit
```

`npm run build` copies `web/` to `dist/` and bundles `server/index.ts` to
`dist-server/index.mjs`.

To run the built server locally:

```sh
PORT=3000 DATABASE_URL=https://<uid>.db.apphor.de/index.mjs node dist-server/index.mjs
```

The server requires the remote database module and completion configuration for
function creation and execution. Static pages and the OpenAPI document can be
tested without an authenticated profile.

## API

The complete raw contract is available at:

```text
GET /api
```

JSON is returned by default. Request YAML with either:

```text
Accept: application/yaml
```

or:

```text
GET /api?format=yaml
```

### Functions

```text
GET    /api/fn
POST   /api/fn
GET    /api/fn/{functionId}
PUT    /api/fn/{functionId}
DELETE /api/fn/{functionId}
GET    /api/fn/{functionId}/{version}
POST   /api/run/{functionId}
```

The stable function ID identifies a logical function. Each create/update stores
an immutable numbered version. The unversioned function and run endpoints use
the active version. Explicit version URLs provide reproducible reads and runs.

Each function version contains:

| Field | Description |
| --- | --- |
| `functionId` | Stable UUID for the logical function |
| `version` | Immutable positive version number |
| `prompt` | Prompt with optional `{placeholder}` markers |
| `name` | Human-readable function name |
| `model` | OpenAI-compatible model override |
| `format` | Completion format, currently `chat` |
| `output` | `json` or `text` |

JSON output requests the provider to return valid JSON and parses the result
server-side. Text output returns provider text as `text/plain`.

### Errors

Errors use this shape:

```json
{
  "error": {
    "code": "VERSION_NOT_FOUND",
    "message": "Function version not found"
  }
}
```

## Database

`DATABASE_URL` must point to an HTTPS ESM module such as:

```text
https://<uid>.db.apphor.de/index.mjs
```

The module must export `get(sql, data)`, `run(sql, data)`, and `all(sql, data)`.
It may export `pragma(values)`. The server imports this module during bootstrap,
enables foreign keys, and creates these tables if necessary:

- `functions`: stable IDs, owner, active version, latest version, timestamps
- `function_versions`: immutable prompt/configuration snapshots

## Providers And Authentication

The server sends OpenAI-compatible chat requests to `API_CHAT_URL` using
`API_KEY` and `API_MODEL`. Ollama and other compatible local providers can be
used by setting `API_CHAT_URL` to their compatible endpoint.

`AUTH_URL` is used to resolve the current profile from the incoming cookie.
The browser sign-in control uses the hosted auth flow at `auth.aifn.run`.

Required environment variables:

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP listening port |
| `DATABASE_URL` | Remote SQLite ESM module |
| `AUTH_URL` | Profile lookup endpoint |
| `API_CHAT_URL` | OpenAI-compatible chat endpoint |
| `API_KEY` | Provider bearer token |
| `API_MODEL` | Default model |
| `SYSTEM_MESSAGE` | Optional text-mode system message |

## Deployment

The production image is a two-stage build using
`ghcr.io/cloud-cli/node:latest` for both stages. The builder installs
development dependencies and runs `npm run build`. The runtime stage installs
only production dependencies, copies the built website, compiled server, and
OpenAPI files from the builder, and runs `dist-server/index.mjs` through the
package `main` field.

Static assets and the OpenAPI document are sent with:

```text
Cache-Control: public, max-age=604800, must-revalidate
```

Function execution responses use `no-store` because generated output must not be
cached.

## Next Work

- Add rollback endpoint and version history UI.
- Add shared generated TypeScript types from OpenAPI.
- Add unit tests for versioning, prompt interpolation, output parsing, ownership,
  and provider failures.
- Add Playwright coverage for the Li3 editor and authenticated flows.
- Add a migration for legacy function records.
