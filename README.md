# aifn.run

AI as a function: define an instruction once, then call it from JavaScript like
an ordinary asynchronous function.

This repository contains the current aifn.run web application and API. It is
also the baseline for the next platform version. The current implementation is
intentionally documented here before the TypeScript, OpenAPI, website, and
editor rewrite begins.

## Current Status

- The browser application is a Vue 3 single-page application built with Vite.
- The API is a Node-compatible middleware module written in JavaScript ESM
  (`.mjs`).
- Function data and settings are stored through an external HTTP store.
- Authentication and profile data are provided by `auth.aifn.run`.
- AI requests are proxied to configured prompt or chat completion services.
- There are currently no unit or end-to-end test files in this repository.
- `/api` is currently the browser's API documentation page. It is not yet an
  OpenAPI document endpoint.
- The current Vue application is an interim build while the Li3 migration is in
  progress; the target website will remove the Vite/Vue toolchain.

## Product Model

An AI function consists of:

| Field | Meaning |
| --- | --- |
| `uid` | UUID used to identify the function |
| `p` | Required prompt/instruction text |
| `name` | Optional display name and suggested import name |
| `model` | Optional model override; otherwise the server default is used |
| `format` | Completion format, currently `chat` or `prompt` |
| `oid` | Owner profile ID; empty for functions created without a logged-in profile |
| `hash` | SHA-256 de-duplication key based on prompt, model, name, and owner |

Inputs can be a JSON object, whose keys replace `{placeholders}` in the prompt,
or plain text, which is appended to the prompt. The result is returned as plain
text.

## Repository Map

```text
.
├── main.ts                         Vue application entrypoint
├── index.html                      SPA shell and external styles/scripts
├── vite.config.ts                  Vite + Vue configuration
├── components/
│   ├── App.vue                     Shell, navigation, auth/profile controls
│   ├── functions/
│   │   ├── Functions.vue           Function list and expandable editor
│   │   └── Editor.vue              Create, edit, delete, copy, and run UI
│   ├── guide/
│   │   ├── GettingStarted.vue      Intro and browser code playground
│   │   ├── ApiDocs.vue              Current in-app API documentation
│   │   └── CodeBlock.vue            Remote syntax highlighting wrapper
│   ├── user/Me.vue                 Profile and sign-out view
│   ├── about/Privacy.vue           Privacy policy view
│   └── Settings.vue                Settings form component
├── composables/
│   ├── useAuth.ts                  Auth/profile state and auth properties
│   ├── useFunctions.ts             Browser calls to function endpoints
│   ├── useRouter.ts                Hash routes and page metadata
│   ├── useSettings.ts              Browser settings calls
│   ├── useProperty.ts              Auth-backed per-user properties
│   └── constants.ts                Unused auth host constant
├── server/
│   ├── index.mjs                   HTTP middleware and all application routes
│   ├── auth.mjs                    Profile lookup through AUTH_URL
│   ├── resource.mjs                HTTP store adapter
│   ├── completions.mjs              Prompt/chat provider adapter
│   ├── utils.mjs                   Request body, logging, and error helpers
│   └── assets/ai.mjs               Public browser client module
├── Dockerfile                      Production container definition
├── .github/workflows/cicd.yml      Reusable Docker/GHCR build workflow
└── package.json                    Dependencies and build scripts
```

## Local Development

Requirements:

- Node.js with npm
- Access to the external auth, store, and completion services for live API use

Install dependencies and build the SPA:

```sh
npm install
npm run build
```

The only project scripts currently are:

| Script | Command | Purpose |
| --- | --- | --- |
| `ci` | `npm i && npm run build` | CI install and production build |
| `build` | `vite build` | Emit the browser bundle to `dist/` |

There is no repository-owned development server script. Vite can be invoked
directly with `npx vite`, but API middleware and its required environment
services must be supplied separately by the hosting environment.

## HTTP API

The active API middleware is `server/index.mjs`. It receives `(req, res, next)`
and delegates unmatched requests to `next()`.

### `POST /fn`

Create or de-duplicate a function. The server generates a UUID before saving.
The body must contain a truthy `p` value. It accepts `p`, `name`, `model`, and
`format` (default: `chat`). If an identical hash already exists for the same
owner, the existing UID is returned instead of creating another record.

Response:

```json
{ "uid": "function-uuid" }
```

The current browser client sends credentials and the public `ai.mjs` client can
send an `Authorization` header, but the current server uses the cookie-based
profile lookup for ownership.

### `PUT /fn/:uid`

Save a function at a requested UUID. The same body validation and de-duplication
rules as `POST /fn` apply. The response is the same UID JSON object. The current
implementation does not enforce that the caller owns an existing function
before updating it; ownership is applied to the stored record used by the save.

### `GET /fn`

List functions visible to the current profile. The server returns records whose
`oid` matches the authenticated profile ID or whose `oid` is empty. Authentication
failure results in an anonymous/empty owner filter rather than a 401 response.

### `GET /fn/:uid`

Return one function as JSON:

```json
{
  "p": "Translate {text} to English",
  "model": "",
  "name": "translate",
  "uid": "function-uuid",
  "format": "chat"
}
```

Missing functions return `404 Function not found`.

### `DELETE /fn/:uid`

Delete a function. The caller must authenticate successfully and either own the
function or the function must have no owner. The current implementation returns
`202` when the store deletes successfully, `400` when it does not, `401` when
profile lookup fails, and `403` for a function owned by another profile.

### `GET /fn/:uid.js`

Return a generated JavaScript module with permissive CORS and a one-week cache:

```js
import ai from 'https://aifn.run/ai.mjs';
export default (inputs) => ai.call('function-uuid', inputs);
```

The UID must match the UUID pattern. This endpoint generates a module without
checking that the function exists, so a later call may fail if the UID is not
stored.

### `POST /run/:uid`

Execute a stored function. The body may be JSON such as:

```json
{ "inputs": { "length": "20" } }
```

or plain text. JSON uses its `inputs` property; invalid JSON is treated as
trimmed text. The server replaces prompt markers, sends a prompt or chat request
to the configured completion provider, and returns the generated text as
`text/plain`. Calls are also written to the `history` store with the UID, parsed
input, output, and raw request body.

The route supports an `OPTIONS` response for CORS. `POST` allows any origin.

### `GET /settings` and `PUT /settings`

Settings are stored by authenticated profile ID in the `settings` resource.
`GET` returns the saved object or `{}`. `PUT` parses and stores the request JSON.
Both operations depend on successful profile lookup and currently return a
generic `500` response for failures.

### `GET /ai.mjs`

Return the public browser client module. The server replaces the module's
`__BASE_URL__` placeholder with the `x-forwarded-for` request header. The module
is served with permissive CORS and a one-week cache.

The public client exports a default object with:

```ts
ai.fn(optionsOrPrompt)       // create, then return an async callable
ai.create(optionsOrPrompt)   // create and return a UID
ai.update(uid, optionsOrPrompt)
ai.call(uid, inputs)
ai.configure(key)
```

The browser client uses `globalThis.aiBaseURL` when set, otherwise it uses the
host represented by the server-generated module. `configure()` sets an
Authorization header, although the current API's ownership checks are based on
the auth cookie/profile integration.

## Completion Providers

`server/completions.mjs` selects the provider endpoint from the function format:

- `chat` uses `API_CHAT_URL` and sends `messages`.
- `prompt` uses `API_PROMPT_URL` and sends `prompt` plus `max_tokens`.
- `model` falls back to `API_MODEL` when the function has no model.
- `format` falls back to `API_FORMAT` when the function has no format.
- `SYSTEM_MESSAGE` is prepended as a system message or prompt text.
- `API_KEY` is sent as a bearer token.

The expected provider response is OpenAI-shaped: prompt responses are read from
`choices[0].text`; chat responses concatenate `choices[*].message.content`.

## External Services and Environment

The server expects these environment variables:

| Variable | Used by | Purpose |
| --- | --- | --- |
| `AUTH_URL` | `server/auth.mjs` | Profile endpoint receiving the request cookie |
| `DATABASE_URL` | `server/database.mjs` | HTTPS URL of the database ESM module |
| `STORE_URL` | `server/resource.mjs` | Legacy resource-store URL used by the current API |
| `API_CHAT_URL` | `server/completions.mjs` | Chat completion endpoint |
| `API_PROMPT_URL` | `server/completions.mjs` | Legacy prompt completion endpoint |
| `API_KEY` | `server/completions.mjs` | Upstream completion bearer token |
| `API_MODEL` | `server/completions.mjs` | Default completion model |
| `API_FORMAT` | `server/completions.mjs` | Default completion format |
| `SYSTEM_MESSAGE` | `server/completions.mjs` | Optional system instruction |
| `DEBUG` | `server/utils.mjs` | Enables console and `log` resource writes |

The database module is imported during server bootstrap from `DATABASE_URL`. It
must expose `get(statement, data)`, `run(statement, data)`, and
`all(statement, data)` operations, and may expose `pragma(values)`. The current
resource adapter still uses the older `STORE_URL` resource-store interface while
the typed SQLite repository migration is in progress. Errors are also written
to the `log` resource. Store failures are generally converted to empty reads or
generic server errors rather than a structured API error response.

## Web Application

The active SPA uses Vue Router with hash history and these routes:

| Route | View | Access |
| --- | --- | --- |
| `/` | Getting Started and browser playground | Public |
| `/api` | Handwritten JavaScript/HTTP API documentation | Public |
| `/functions` | Function list and editor | Authenticated navigation |
| `/me` | Profile and logout | Authenticated navigation |
| `/ai/privacy` | Privacy policy | Public |

Authentication state comes from the remote module
`https://auth.aifn.run/auth.js`. The UI loads the profile on mount, displays a
sign-in control for anonymous users, and shows the first profile-name character
when logged in. Function listing, saving, deleting, and settings requests use
browser credentials.

The current editor supports:

- Function name, model, format, and prompt fields
- `{placeholder}` prompt guidance
- Create, update, and delete actions
- Generated import snippet and UID copy actions
- Executing a function from the browser using a dynamically inserted module
- A basic output history while the editor is open

The current playground and editor override `console.log` globally while active;
this is a known limitation to address in the new editor.

## Deployment

Pushes trigger `.github/workflows/cicd.yml`, which delegates to
`cloud-cli/workflows/.github/workflows/docker-ghcr-build.yml@main`. The workflow
builds `aifn-run/aifn-run` using `cloud-cli/node:latest`, publishes with the
configured tags, and uses `main` as the default branch.

The production container uses `ghcr.io/cloud-cli/node:latest`, installs
production dependencies from the lockfile, and copies the built `dist/` website
and `server/` middleware. The package `main` field points to `server/index.mjs`,
which is used by the hosting/runtime integration as the application entrypoint.
Static assets must be served with a maximum cache age of one week. The
generated `/ai.mjs` and function modules also use one-week cache headers.

## Known Gaps And Rewrite Targets

These are current implementation facts, not promises about the new version:

- Convert all application and server code to TypeScript with shared request and
  response types.
- Add unit tests for prompt interpolation, payload construction, API routing,
  ownership, and client behavior.
- Add Playwright coverage for public docs, authentication-gated functions, editor
  save/run/delete flows, and responsive layouts.
- Define the HTTP API in an OpenAPI document and serve that specification from a
  real `/api` endpoint. The current `/api` route is a client-side page.
- Replace generic text errors with consistent status codes and structured error
  bodies.
- Clarify and enforce authentication semantics for API keys, cookies, anonymous
  functions, and update/delete ownership.
- Replace the current external-store adapter with an explicit typed persistence
  contract, or document the store contract formally.
- Build a new website and a modern AI-function editor while retaining the
  existing create, update, list, delete, import, and run capabilities.
- Remove the interim Vite/Vue toolchain after the Li3 website migration.
- Add local development and preview commands that run the website and API
  together.

## License And Privacy

No license file is currently present. The in-app privacy policy says that the
service uses a session cookie, receives name and email from Google on sign-up,
and uses Google Analytics. Review and update this policy as part of the new
platform launch.
