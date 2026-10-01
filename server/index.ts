import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import { createAuth } from "./auth.js";
import migrationInitialSchema from "./migrations/001-initial-schema.js";
import migrationProviderEndpoint from "./migrations/002-provider-endpoint.js";
import migrationFunctionVisibility from "./migrations/003-function-visibility.js";
import migrationOidcSessions from "./migrations/004-oidc-sessions.js";
import migrationFunctionInputSchema from "./migrations/005-function-input-schema.js";
import migrationProviderSlug from "./migrations/006-provider-slug.js";
import migrationProviders from "./migrations/007-providers.js";
import migrationPromptHash from "./migrations/008-function-prompt-hash.js";
import { decrypt, encrypt } from "./secrets.js";
import type { Migration } from "./migrations/types.js";

type OutputMode = "json" | "text";
type Database = {
  get(sql: string, data?: unknown): Promise<any>;
  run(sql: string, data?: unknown): Promise<any>;
  all(sql: string, data?: unknown): Promise<any[]>;
  pragma?: (values: string[]) => void;
};
type FunctionVersion = {
  functionId: string;
  ownerId: string | null;
  version: number;
  prompt: string;
  name: string;
  model: string;
  format: string;
  output: OutputMode;
  providerEndpoint: string;
  providerSlug: string;
  public: boolean;
  inputSchema: Array<{ name: string; type: "string" | "number" | "boolean" }>;
  active?: boolean;
};
class ProviderError extends Error {
  status: number;
  body: string;
  url: string;
  keyUsed: boolean;
  constructor(status: number, body: string, url: string, keyUsed: boolean, message?: string) {
    super(message || `Provider returned ${status}`);
    this.status = status;
    this.body = body;
    this.url = url;
    this.keyUsed = keyUsed;
  }
}

const root = fileURLToPath(new URL("..", import.meta.url));
const port = Number(process.env.PORT || 3000);
const cacheControl = "public, max-age=604800, must-revalidate";
const revalidateControl = "public, max-age=86400, must-revalidate";
const debugEnabled = process.env.DEBUG === "1" || process.env.DEBUG === "true";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const openapiJSON = await readFile(join(root, "openapi/openapi.json"), "utf8");
const openapiYAML = await readFile(join(root, "openapi/openapi.yaml"), "utf8");
const database = await loadDatabase();
database.pragma?.(["foreign_keys = ON"]);
await migrate();
const auth = createAuth(database);

function debug(message: string, details?: unknown) {
  if (!debugEnabled) {
    return;
  }
  console.log(`[debug] ${message}`, details === undefined ? "" : details);
}

async function loadDatabase(): Promise<Database> {
  const address = process.env.DATABASE_URL;
  if (!address) {
    throw new Error("DATABASE_URL is required");
  }

  const url = new URL(address);
  const module = await import(url.href);
  const db = module.default || module;
  return db;
}

async function migrate() {
  debug("migration check started");
  await database.run(`CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`);
  const applied = new Set((await database.all(`SELECT id FROM schema_migrations`)).map((row) => row.id));
  const migrations: Migration[] = [
    migrationInitialSchema,
    migrationProviderEndpoint,
    migrationFunctionVisibility,
    migrationOidcSessions,
    migrationFunctionInputSchema,
    migrationProviderSlug,
    migrationProviders,
    migrationPromptHash,
  ];
  for (const migration of migrations) {
    if (applied.has(migration.id)) {
      continue;
    }
    debug("applying migration", migration.id);
    await migration.up(database);
    await database.run(`INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)`, [
      migration.id,
      new Date().toISOString(),
    ]);
  }
}

function send(
  res: ServerResponse,
  status: number,
  body: unknown,
  type = "application/json; charset=utf-8",
  headers: Record<string, string> = {},
) {
  const content = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, { "content-type": type, "content-length": Buffer.byteLength(content), ...headers });
  res.end(content);
  return true;
}

function error(res: ServerResponse, status: number, code: string, message: string) {
  return send(res, status, { error: { code, message } });
}
function redirect(res: ServerResponse, location: string, headers: Record<string, string> = {}) {
  res.writeHead(302, { location, ...headers });
  res.end();
  return true;
}
function body(req: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
function requestOf(req: IncomingMessage) {
  return new Request(`http://${req.headers.host || "localhost"}${req.url || "/"}`, {
    headers: { cookie: req.headers.cookie || "" },
  });
}
async function profileId(req: IncomingMessage) {
  return (await auth.session(requestOf(req)))?.id || null;
}
async function requireAuthentication(req: IncomingMessage, res: ServerResponse) {
  if (await auth.session(requestOf(req))) {
    return true;
  }
  error(res, 401, "AUTHENTICATION_REQUIRED", "Authentication required");
  return false;
}
function versionJSON(row: any): FunctionVersion {
  return {
    functionId: row.function_id,
    ownerId: row.owner_id || null,
    version: Number(row.version),
    prompt: row.prompt,
    name: row.name,
    model: row.model,
    format: row.format,
    output: row.output,
    providerEndpoint: row.provider_endpoint || "",
    providerSlug: row.provider_slug || "",
    public: Boolean(row.is_public),
    inputSchema: JSON.parse(row.input_schema || "[]"),
    active: Boolean(row.active),
  };
}

function hashPrompt(prompt: string) {
  return createHash("sha256").update(prompt, "utf8").digest("hex");
}

async function getVersion(id: string, version?: number) {
  const row = version
    ? await database.get(
        `SELECT v.*, f.owner_id, f.is_public, f.active_version = v.version AS active FROM function_versions v JOIN functions f ON f.id = v.function_id WHERE v.function_id = ? AND v.version = ?`,
        [id, version],
      )
    : await database.get(
        `SELECT v.*, f.owner_id, f.is_public, 1 AS active FROM function_versions v JOIN functions f ON f.id = v.function_id WHERE v.function_id = ? AND v.version = f.active_version`,
        [id],
      );
  return row ? versionJSON(row) : null;
}

async function saveFunction(req: IncomingMessage, res: ServerResponse, id?: string) {
  if (!(await requireAuthentication(req, res))) {
    return true;
  }
  let input: any;
  try {
    input = JSON.parse(await body(req));
  } catch {
    return error(res, 400, "INVALID_JSON", "Request body must be JSON");
  }
  if (!input.prompt || typeof input.prompt !== "string") {
    return error(res, 400, "INVALID_PROMPT", "prompt is required");
  }
  if (input.output && !["json", "text"].includes(input.output)) {
    return error(res, 400, "INVALID_OUTPUT", "output must be json or text");
  }
  if (input.public !== undefined && typeof input.public !== "boolean") {
    return error(res, 400, "INVALID_VISIBILITY", "public must be a boolean");
  }
  if (input.deduplicatePrompt !== undefined && typeof input.deduplicatePrompt !== "boolean") {
    return error(res, 400, "INVALID_PROMPT_DEDUPLICATION", "deduplicatePrompt must be a boolean");
  }
  if (
    input.deduplicatePrompt === true &&
    (id || Object.keys(input).some((key) => key !== "prompt" && key !== "deduplicatePrompt"))
  ) {
    return error(
      res,
      400,
      "INVALID_PROMPT_DEDUPLICATION",
      "deduplicatePrompt only supports prompt-only function creation",
    );
  }
  const functionId = id || randomUUID();
  const ownerId = await profileId(req);
  if (!ownerId) return error(res, 401, "AUTHENTICATION_REQUIRED", "Authentication required");
  const promptHash = input.deduplicatePrompt === true ? hashPrompt(input.prompt) : null;
  if (promptHash) {
    const existing = await database.get(`SELECT id FROM functions WHERE owner_id = ? AND prompt_hash = ?`, [
      ownerId,
      promptHash,
    ]);
    if (existing) return send(res, 200, { functionId: existing.id });
  }
  const now = new Date().toISOString();
  const current = id ? await database.get(`SELECT * FROM functions WHERE id = ?`, [id]) : null;
  if (id && !current) {
    return error(res, 404, "FUNCTION_NOT_FOUND", "Function not found");
  }
  if (current && current.owner_id !== ownerId) return error(res, 404, "FUNCTION_NOT_FOUND", "Function not found");
  const version = current ? Number(current.latest_version) + 1 : 1;
  if (!current) {
    try {
      await database.run(
        `INSERT INTO functions (id, owner_id, is_public, active_version, latest_version, created_at, updated_at, prompt_hash) VALUES (?, ?, ?, 1, 1, ?, ?, ?)`,
        [functionId, ownerId, input.public === true ? 1 : 0, now, now, promptHash],
      );
    } catch (cause) {
      if (promptHash) {
        const existing = await database.get(`SELECT id FROM functions WHERE owner_id = ? AND prompt_hash = ?`, [
          ownerId,
          promptHash,
        ]);
        if (existing) return send(res, 200, { functionId: existing.id });
      }
      throw cause;
    }
  } else {
    await database.run(
      `UPDATE functions SET is_public = ?, latest_version = ?, active_version = ?, updated_at = ?, prompt_hash = NULL WHERE id = ?`,
      [
        input.public === undefined ? Number(current.is_public) : input.public === true ? 1 : 0,
        version,
        version,
        now,
        functionId,
      ],
    );
  }
  await database.run(
    `INSERT INTO function_versions (function_id, version, prompt, name, model, format, output, provider_endpoint, provider_slug, input_schema, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      functionId,
      version,
      input.prompt,
      input.name || "",
      input.model || "",
      input.format || "chat",
      input.output || "json",
      input.providerEndpoint || "",
      input.providerSlug || "",
      JSON.stringify(
        Array.isArray(input.inputSchema)
          ? input.inputSchema
              .filter(
                (item: any) =>
                  item && typeof item.name === "string" && ["string", "number", "boolean"].includes(item.type),
              )
              .map((item: any) => ({ name: item.name.trim(), type: item.type }))
          : [],
      ),
      now,
    ],
  );
  return send(res, 201, await getVersion(functionId, version));
}

function normalizeInput(raw: unknown, schema: FunctionVersion["inputSchema"]) {
  if (typeof raw === "string") {
    return raw;
  }
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const clean: Record<string, unknown> = Object.create(null);
  for (const item of schema) {
    if (!Object.prototype.hasOwnProperty.call(source, item.name)) {
      continue;
    }
    const value = source[item.name];
    if (item.type === "number") {
      const number = typeof value === "number" ? value : Number(String(value));
      if (Number.isFinite(number)) {
        clean[item.name] = number;
      }
    } else if (item.type === "boolean") {
      if (value === true || value === false) {
        clean[item.name] = value;
      } else if (value === "true" || value === "false") {
        clean[item.name] = value === "true";
      }
    } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      clean[item.name] = String(value);
    }
  }
  return schema.length ? clean : source;
}
function interpolate(prompt: string, input: unknown) {
  if (typeof input === "string") {
    return `${prompt}\n${input}`;
  }
  return prompt.replace(/\{\{\s*([A-Za-z_][\w.-]*)\s*\}\}/g, (_, key) => {
    const value = (input as Record<string, unknown>)?.[key];
    return value && typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
  });
}
async function complete(fn: FunctionVersion, input: unknown, req: IncomingMessage) {
  const content = interpolate(fn.prompt, input);
  const json = fn.output === "json";
  const userId = fn.ownerId;
  const provider =
    userId && fn.providerSlug
      ? await database.get(`SELECT url, default_model, encrypted_key FROM providers WHERE user_id = ? AND slug = ?`, [
          userId,
          fn.providerSlug,
        ])
      : null;
  if (fn.providerSlug && !provider) {
    throw new ProviderError(
      0,
      `No provider named "${fn.providerSlug}" is configured for this account.`,
      "",
      false,
      "Selected provider is not configured",
    );
  }
  const endpoint = resolveChatEndpoint(fn.providerEndpoint || provider?.url || process.env.API_CHAT_URL || "");
  const key = provider?.encrypted_key ? decrypt(provider.encrypted_key) : process.env.API_KEY || "";
  const diagnosticUrl = safeProviderUrl(endpoint);
  debug("provider request", {
    functionId: fn.functionId,
    version: fn.version,
    url: diagnosticUrl,
    keyUsed: Boolean(key),
    model: fn.model || provider?.default_model || process.env.API_MODEL,
    output: fn.output,
  });
  const messages = [
    {
      role: "system",
      content: json
        ? "Return only valid JSON. Do not use Markdown fences or commentary."
        : process.env.SYSTEM_MESSAGE || "",
    },
    { role: "user", content },
  ].filter((message) => message.content);
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: fn.model || provider?.default_model || process.env.API_MODEL,
        messages,
        response_format: json ? { type: "json_object" } : undefined,
      }),
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Provider request failed";
    const safeMessage = redactSecret(message, key);
    throw new ProviderError(0, safeMessage, diagnosticUrl, Boolean(key), `Provider request failed: ${safeMessage}`);
  }
  const responseText = await response.text();
  if (!response.ok) {
    throw new ProviderError(response.status, redactSecret(responseText, key), diagnosticUrl, Boolean(key));
  }
  let result: any;
  try {
    result = JSON.parse(responseText);
  } catch {
    throw new ProviderError(
      response.status,
      redactSecret(responseText, key),
      diagnosticUrl,
      Boolean(key),
      "Provider response was not valid JSON",
    );
  }
  const text = result.choices?.map((choice: any) => choice.message?.content || "").join("\n") || "";
  if (!json) {
    return text;
  }
  try {
    return JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
  } catch {
    throw new ProviderError(
      response.status,
      redactSecret(text, key),
      diagnosticUrl,
      Boolean(key),
      "Provider returned invalid function JSON",
    );
  }
}

function resolveChatEndpoint(configured: string) {
  if (!configured) {
    throw new Error("No provider endpoint is configured");
  }
  const endpoint = new URL(configured);
  if (!["http:", "https:"].includes(endpoint.protocol)) {
    throw new Error("Provider URL must use HTTP or HTTPS");
  }
  endpoint.pathname = endpoint.pathname.replace(/\/+$/, "");
  if (endpoint.pathname.endsWith("/chat/completions")) {
    return endpoint.toString();
  }
  if (endpoint.pathname.endsWith("/v1")) {
    endpoint.pathname += "/chat/completions";
  } else if (!endpoint.pathname || endpoint.pathname === "/") {
    endpoint.pathname = "/v1/chat/completions";
  } else {
    endpoint.pathname += "/v1/chat/completions";
  }
  return endpoint.toString();
}
function safeProviderUrl(endpoint: string) {
  const url = new URL(endpoint);
  url.username = "";
  url.password = "";
  url.search = "";
  url.hash = "";
  return url.toString();
}
function redactSecret(value: string, secret: string) {
  return secret ? value.split(secret).join("[redacted]") : value;
}

function createFunctionModule(functionId: string) {
  return `const functionId = '${functionId}';
const moduleURL = new URL(import.meta.url);
const baseURL = globalThis.aiBaseURL || (['http:', 'https:'].includes(moduleURL.protocol) ? moduleURL.origin : 'https://aifn.run');
export default async function (inputs) {
  const response = await fetch(new URL('/api/run/' + functionId, baseURL), {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ inputs }),
  });
  if (!response.ok) throw new Error(response.status + ': ' + await response.text());
  return response.headers.get('content-type')?.includes('application/json') ? response.json() : response.text();
}
`;
}

async function requireFunctionAccess(req: IncomingMessage, res: ServerResponse, fn: FunctionVersion) {
  if (fn.public) {
    return true;
  }
  const profile = await auth.session(requestOf(req));
  if (profile && profile.id === fn.ownerId) {
    return true;
  }
  error(res, 404, "FUNCTION_NOT_FOUND", "Function not found");
  return false;
}

async function api(req: IncomingMessage, res: ServerResponse, url: URL) {
  debug("api request", { method: req.method, path: url.pathname, query: url.search });
  if (url.pathname === "/client.mjs" && req.method === "GET") {
    return false;
  }
  if (url.pathname === "/api") {
    const yaml = (req.headers.accept || "").includes("yaml") || url.searchParams.get("format") === "yaml";
    return send(
      res,
      200,
      yaml ? openapiYAML : openapiJSON,
      yaml ? "application/yaml; charset=utf-8" : "application/json; charset=utf-8",
      { "cache-control": cacheControl },
    );
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "api") {
    return false;
  }
  if (parts[1] === "fn" && parts[2]?.endsWith(".js") && req.method === "GET") {
    const functionId = parts[2].slice(0, -3);
    if (!uuid.test(functionId)) {
      return error(res, 400, "INVALID_FUNCTION_ID", "Invalid function ID");
    }
    const fn = await getVersion(functionId);
    if (!fn || !(await requireFunctionAccess(req, res, fn))) return true;
    const code = createFunctionModule(functionId);
    return send(res, 200, code, "text/javascript; charset=utf-8", {
      ...(fn.public ? { "access-control-allow-origin": "*" } : {}),
      "cache-control": fn.public ? cacheControl : "no-store",
    });
  }
  if (parts[1] === "providers") {
    if (!(await requireAuthentication(req, res))) {
      return true;
    }
    const userId = await profileId(req);
    if (req.method === "GET") {
      const providers = await database.all(
        `SELECT slug, url, default_model, encrypted_key FROM providers WHERE user_id = ? ORDER BY slug`,
        [userId],
      );
      return send(
        res,
        200,
        providers.map((item) => ({
          slug: item.slug,
          url: item.url,
          defaultModel: item.default_model,
          keyConfigured: Boolean(item.encrypted_key),
        })),
      );
    }
    if (req.method === "PUT") {
      let input: any;
      try {
        input = JSON.parse(await body(req));
      } catch {
        return error(res, 400, "INVALID_JSON", "Request body must be JSON");
      }
      if (!input.slug || !/^[a-z0-9-]+$/.test(input.slug) || !input.url) {
        return error(res, 400, "INVALID_PROVIDER", "slug and url are required");
      }
      const current = await database.get(`SELECT encrypted_key FROM providers WHERE user_id = ? AND slug = ?`, [
        userId,
        input.slug,
      ]);
      await database.run(
        `INSERT INTO providers (user_id, slug, url, default_model, encrypted_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, slug) DO UPDATE SET url = excluded.url, default_model = excluded.default_model, encrypted_key = excluded.encrypted_key, updated_at = excluded.updated_at`,
        [
          userId,
          input.slug,
          String(input.url),
          String(input.defaultModel || ""),
          input.key ? encrypt(String(input.key)) : current?.encrypted_key || "",
          new Date().toISOString(),
          new Date().toISOString(),
        ],
      );
      return send(res, 200, {
        slug: input.slug,
        url: input.url,
        defaultModel: input.defaultModel || "",
        keyConfigured: Boolean(input.key || current?.encrypted_key),
      });
    }
    if (req.method === "DELETE" && parts[2]) {
      await database.run(`DELETE FROM providers WHERE user_id = ? AND slug = ?`, [userId, parts[2]]);
      return res.writeHead(204).end();
    }
  }
  if (parts[1] === "fn" && parts.length === 2 && req.method === "GET") {
    const profile = await auth.session(requestOf(req));
    const visibility = url.searchParams.get("visibility");
    if (visibility === "all" && !profile) return error(res, 401, "AUTHENTICATION_REQUIRED", "Authentication required");
    const requestedPage = Number(url.searchParams.get("page") || 1);
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const requestedPageSize = Number(url.searchParams.get("pageSize") || 50);
    const pageSize =
      Number.isInteger(requestedPageSize) && requestedPageSize > 0 ? Math.min(50, requestedPageSize) : 50;
    const offset = (page - 1) * pageSize;
    const ownOnly = visibility === "all";
    const where = ownOnly ? "f.owner_id = ?" : profile ? "(f.is_public = 1 OR f.owner_id = ?)" : "f.is_public = 1";
    const filters = profile ? [profile.id] : [];
    const totalRow = await database.get(`SELECT COUNT(*) AS total FROM functions f WHERE ${where}`, filters);
    const ordering =
      profile && !ownOnly
        ? "CASE WHEN f.is_public = 0 AND f.owner_id = ? THEN 0 ELSE 1 END, v.name COLLATE NOCASE"
        : "v.name COLLATE NOCASE";
    const orderingArgs = profile && !ownOnly ? [profile.id] : [];
    const rows = await database.all(
      `SELECT f.id AS function_id, f.active_version AS version, v.name, v.model, v.provider_slug, v.provider_endpoint, v.input_schema, v.output, f.is_public FROM functions f JOIN function_versions v ON v.function_id = f.id AND v.version = f.active_version WHERE ${where} ORDER BY ${ordering} LIMIT ? OFFSET ?`,
      [...filters, ...orderingArgs, pageSize, offset],
    );
    const total = Number(totalRow?.total || 0);
    return send(res, 200, {
      functions: rows.map((row) => ({
        functionId: row.function_id,
        version: Number(row.version),
        name: row.name,
        model: row.model,
        provider: row.provider_slug || (row.provider_endpoint ? new URL(row.provider_endpoint).hostname : "default"),
        inputSchema: JSON.parse(row.input_schema || "[]"),
        output: row.output,
        public: Boolean(row.is_public),
      })),
      page,
      pageSize,
      total,
      hasNext: offset + rows.length < total,
    });
  }
  if (parts[1] === "fn" && parts.length === 2 && req.method === "POST") {
    return saveFunction(req, res);
  }
  if (parts[1] === "fn" && uuid.test(parts[2] || "")) {
    const id = parts[2];
    const versionValue = parts[3] ? Number(parts[3]) : undefined;
    const invalidVersion = parts[3] !== undefined && (!Number.isInteger(versionValue) || (versionValue ?? 0) < 1);
    if (parts.length > 4 || invalidVersion) {
      return error(res, 400, "INVALID_VERSION", "Invalid function version");
    }
    if (req.method === "GET") {
      const found = await getVersion(id, versionValue);
      if (!found) {
        return error(res, 404, "VERSION_NOT_FOUND", "Function version not found");
      }
      if (!(await requireFunctionAccess(req, res, found))) {
        return true;
      }
      return send(res, 200, found);
    }
    if (req.method === "PUT" && versionValue === undefined) {
      return saveFunction(req, res, id);
    }
    if (req.method === "DELETE" && versionValue === undefined) {
      const owner = await profileId(req);
      if (!owner) return error(res, 401, "AUTHENTICATION_REQUIRED", "Authentication required");
      const functionOwner = await database.get(`SELECT owner_id FROM functions WHERE id = ?`, [id]);
      if (!functionOwner || functionOwner.owner_id !== owner)
        return error(res, 404, "FUNCTION_NOT_FOUND", "Function not found");
      const result = await database.run(`DELETE FROM functions WHERE id = ?`, [id]);
      return result ? res.writeHead(204).end() : error(res, 404, "FUNCTION_NOT_FOUND", "Function not found");
    }
  }
  if (parts[1] === "run" && uuid.test(parts[2] || "") && req.method === "POST") {
    const fn = await getVersion(
      parts[2],
      url.searchParams.get("version") ? Number(url.searchParams.get("version")) : undefined,
    );
    if (!fn) {
      return error(res, 404, "VERSION_NOT_FOUND", "Function version not found");
    }
    if (!(await requireFunctionAccess(req, res, fn))) {
      return true;
    }
    try {
      const raw = await body(req);
      let input: unknown = raw;
      try {
        input = normalizeInput(JSON.parse(raw).inputs ?? {}, fn.inputSchema);
      } catch {
        input = normalizeInput(raw, fn.inputSchema);
      }
      const output = await complete(fn, input, req);
      const userId = fn.ownerId;
      const configuredProvider =
        userId && fn.providerSlug
          ? await database.get(`SELECT url, encrypted_key FROM providers WHERE user_id = ? AND slug = ?`, [
              userId,
              fn.providerSlug,
            ])
          : null;
      const providerUrl = resolveChatEndpoint(
        fn.providerEndpoint || configuredProvider?.url || process.env.API_CHAT_URL || "",
      );
      const providerKeyUsed = Boolean(configuredProvider?.encrypted_key || process.env.API_KEY);
      return send(
        res,
        200,
        output,
        fn.output === "json" ? "application/json; charset=utf-8" : "text/plain; charset=utf-8",
        {
          "x-aifn-function-id": fn.functionId,
          "x-aifn-version": String(fn.version),
          "x-aifn-provider-url": safeProviderUrl(providerUrl),
          "x-aifn-key-used": String(providerKeyUsed),
          "cache-control": "no-store",
          ...(fn.public ? { "access-control-allow-origin": "*" } : {}),
        },
      );
    } catch (cause) {
      if (cause instanceof ProviderError) {
        return send(
          res,
          502,
          {
            error: {
              code: "PROVIDER_ERROR",
              message: cause.message,
              status: cause.status,
              response: cause.body,
              providerUrl: cause.url,
              keyUsed: cause.keyUsed,
            },
          },
          "application/json; charset=utf-8",
          {
            "x-aifn-provider-url": cause.url,
            "x-aifn-key-used": String(cause.keyUsed),
            ...(fn.public ? { "access-control-allow-origin": "*" } : {}),
          },
        );
      }
      return send(
        res,
        502,
        {
          error: {
            code: "PROVIDER_ERROR",
            message: cause instanceof Error ? cause.message : "Provider request failed",
          },
        },
        "application/json; charset=utf-8",
        fn.public ? { "access-control-allow-origin": "*" } : {},
      );
    }
  }
  return false;
}

async function staticFile(_req: IncomingMessage, res: ServerResponse, url: URL) {
  const dist = join(root, "dist");
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const candidate = normalize(join(dist, requested));
  if (!candidate.startsWith(dist)) {
    return error(res, 403, "FORBIDDEN", "Forbidden");
  }
  const file = extname(candidate) ? candidate : join(dist, "index.html");
  try {
    const info = await stat(file);
    if (!info.isFile()) {
      return false;
    }
    const mime: Record<string, string> = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".mjs": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".webmanifest": "application/manifest+json; charset=utf-8",
      ".svg": "image/svg+xml",
    };
    const extension = extname(file);
    res.writeHead(200, {
      "content-type": mime[extension] || "application/octet-stream",
      "cache-control": revalidateControl,
      ...(extension === ".mjs" ? { "access-control-allow-origin": "*" } : {}),
    });
    createReadStream(file).pipe(res);
    return true;
  } catch {
    return false;
  }
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    debug("incoming request", { method: req.method, path: url.pathname });
    const protocol = req.headers["x-forwarded-proto"]?.toString().split(",")[0] || url.protocol.replace(":", "");
    const origin = `${protocol}://${req.headers.host || url.host}`;
    const redirectUri = `${origin}/auth/callback`;
    if (url.pathname === "/auth/login" && req.method === "GET") {
      return redirect(res, await auth.login(url.searchParams.get("return_to") || "/dashboard", redirectUri));
    }
    if (url.pathname === "/auth/callback" && req.method === "GET") {
      try {
        const result = await auth.callback(
          url.searchParams.get("code") || "",
          url.searchParams.get("state") || "",
          redirectUri,
        );
        return redirect(res, result.returnTo, {
          "set-cookie": `${auth.sessionCookie}=${result.id}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
        });
      } catch (cause) {
        return error(
          res,
          400,
          "AUTHENTICATION_FAILED",
          cause instanceof Error ? cause.message : "Authentication failed",
        );
      }
    }
    if (url.pathname === "/auth/session" && req.method === "GET") {
      return send(res, 200, { profile: await auth.session(req) });
    }
    if (url.pathname === "/auth/provider" && req.method === "GET") {
      return send(res, 200, { url: auth.provider });
    }
    if (url.pathname === "/auth/logout" && (req.method === "POST" || req.method === "GET")) {
      await auth.logout(req);
      return redirect(res, "/", {
        "set-cookie": `${auth.sessionCookie}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      });
    }
    const functionModule = url.pathname.match(/^\/fn\/([0-9a-f-]+)\.mjs$/i);
    if (functionModule && req.method === "GET") {
      const functionId = functionModule[1];
      if (!uuid.test(functionId)) return error(res, 400, "INVALID_FUNCTION_ID", "Invalid function ID");
      const fn = await getVersion(functionId);
      if (!fn || !(await requireFunctionAccess(req, res, fn))) return true;
      const code = createFunctionModule(functionId);
      return send(res, 200, code, "text/javascript; charset=utf-8", {
        ...(fn.public
          ? { "access-control-allow-origin": "*", "cache-control": cacheControl }
          : { "cache-control": "no-store" }),
      });
    }
    if (["/functions", "/editor"].includes(url.pathname) && !(await auth.session(req))) {
      return redirect(res, `/auth/login?return_to=${encodeURIComponent(url.pathname)}`);
    }
    if (req.method === "OPTIONS") {
      res
        .writeHead(204, {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
          "access-control-allow-headers": "content-type,authorization",
        })
        .end();
      return;
    }
    if (url.pathname.startsWith("/api")) {
      if (await api(req, res, url)) {
        return;
      }
      return error(res, 404, "NOT_FOUND", "API route not found");
    }
    if (await staticFile(req, res, url)) {
      return;
    }
    error(res, 404, "NOT_FOUND", "Not found");
  } catch (cause) {
    error(res, 500, "INTERNAL_ERROR", cause instanceof Error ? cause.message : "Internal server error");
  }
});
server.listen(port, "0.0.0.0", () => console.log(`aifn.run listening on ${port}`));
