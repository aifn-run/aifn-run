import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

type OutputMode = "json" | "text";
type Database = { get(sql: string, data?: unknown): Promise<any>; run(sql: string, data?: unknown): Promise<any>; all(sql: string, data?: unknown): Promise<any[]>; pragma?: (values: string[]) => void };
type FunctionVersion = { functionId: string; version: number; prompt: string; name: string; model: string; format: string; output: OutputMode; active?: boolean };

const root = fileURLToPath(new URL("..", import.meta.url));
const port = Number(process.env.PORT || 3000);
const cacheControl = "public, max-age=604800, must-revalidate";
const revalidateControl = "no-cache, must-revalidate";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const openapiJSON = await readFile(join(root, "openapi/openapi.json"), "utf8");
const openapiYAML = await readFile(join(root, "openapi/openapi.yaml"), "utf8");
const database = await loadDatabase();
database.pragma?.(["foreign_keys = ON"]);
await migrate();

async function loadDatabase(): Promise<Database> {
  const address = process.env.DATABASE_URL;
  if (!address) throw new Error("DATABASE_URL is required");
  const url = new URL(address);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("DATABASE_URL must use HTTP or HTTPS");
  const module = await import(url.href);
  const db = module.default || module;
  for (const method of ["get", "run", "all"]) if (typeof db[method] !== "function") throw new Error(`Database module must export ${method}()`);
  return db;
}

async function migrate() {
  await database.run(`CREATE TABLE IF NOT EXISTS functions (id TEXT PRIMARY KEY, owner_id TEXT, active_version INTEGER NOT NULL, latest_version INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`);
  await database.run(`CREATE TABLE IF NOT EXISTS function_versions (function_id TEXT NOT NULL, version INTEGER NOT NULL, prompt TEXT NOT NULL, name TEXT NOT NULL, model TEXT NOT NULL, format TEXT NOT NULL, output TEXT NOT NULL CHECK(output IN ('json', 'text')), created_at TEXT NOT NULL, PRIMARY KEY(function_id, version), FOREIGN KEY(function_id) REFERENCES functions(id) ON DELETE CASCADE)`);
}

function send(res: ServerResponse, status: number, body: unknown, type = "application/json; charset=utf-8", headers: Record<string, string> = {}) {
  const content = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, { "content-type": type, "content-length": Buffer.byteLength(content), ...headers });
  res.end(content);
  return true;
}

function error(res: ServerResponse, status: number, code: string, message: string) { return send(res, status, { error: { code, message } }); }
function body(req: IncomingMessage) { return new Promise<string>((resolve, reject) => { const chunks: Buffer[] = []; req.on("data", (chunk) => chunks.push(chunk)); req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8"))); req.on("error", reject); }); }
function profileId(req: IncomingMessage) { return fetch(process.env.AUTH_URL || "", { headers: { cookie: req.headers.cookie || "" } }).then(async (r) => r.ok ? (await r.json()).id || null : null).catch(() => null); }
function versionJSON(row: any): FunctionVersion { return { functionId: row.function_id, version: Number(row.version), prompt: row.prompt, name: row.name, model: row.model, format: row.format, output: row.output, active: Boolean(row.active) }; }

async function getVersion(id: string, version?: number) {
  const row = version ? await database.get(`SELECT v.*, f.active_version = v.version AS active FROM function_versions v JOIN functions f ON f.id = v.function_id WHERE v.function_id = ? AND v.version = ?`, [id, version]) : await database.get(`SELECT v.*, 1 AS active FROM function_versions v JOIN functions f ON f.id = v.function_id WHERE v.function_id = f.id AND v.version = f.active_version`, [id]);
  return row ? versionJSON(row) : null;
}

async function saveFunction(req: IncomingMessage, res: ServerResponse, id?: string) {
  let input: any;
  try { input = JSON.parse(await body(req)); } catch { return error(res, 400, "INVALID_JSON", "Request body must be JSON"); }
  if (!input.prompt || typeof input.prompt !== "string") return error(res, 400, "INVALID_PROMPT", "prompt is required");
  if (input.output && !["json", "text"].includes(input.output)) return error(res, 400, "INVALID_OUTPUT", "output must be json or text");
  const owner = await profileId(req); const functionId = id || randomUUID(); const now = new Date().toISOString();
  const current = id ? await database.get(`SELECT * FROM functions WHERE id = ?`, [id]) : null;
  if (id && !current) return error(res, 404, "FUNCTION_NOT_FOUND", "Function not found");
  const version = current ? Number(current.latest_version) + 1 : 1;
  if (!current) await database.run(`INSERT INTO functions (id, owner_id, active_version, latest_version, created_at, updated_at) VALUES (?, ?, 1, 1, ?, ?)`, [functionId, owner, now, now]);
  else await database.run(`UPDATE functions SET latest_version = ?, active_version = ?, updated_at = ? WHERE id = ?`, [version, version, now, functionId]);
  await database.run(`INSERT INTO function_versions (function_id, version, prompt, name, model, format, output, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [functionId, version, input.prompt, input.name || "", input.model || "", input.format || "chat", input.output || "json", now]);
  return send(res, 201, await getVersion(functionId, version));
}

function interpolate(prompt: string, input: unknown) { if (typeof input === "string") return `${prompt}\n${input}`; return prompt.replace(/\{([\s\S]+?)\}/g, (_, key) => String((input as Record<string, unknown>)?.[key.trim()] ?? "")); }
async function complete(fn: FunctionVersion, input: unknown) {
  const content = interpolate(fn.prompt, input); const json = fn.output === "json";
  const messages = [{ role: "system", content: json ? "Return only valid JSON. Do not use Markdown fences or commentary." : (process.env.SYSTEM_MESSAGE || "") }, { role: "user", content }].filter((message) => message.content);
  const response = await fetch(process.env.API_CHAT_URL || "", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${process.env.API_KEY || ""}` }, body: JSON.stringify({ model: fn.model || process.env.API_MODEL, messages, response_format: json ? { type: "json_object" } : undefined }) });
  if (!response.ok) throw new Error(`Provider returned ${response.status}`);
  const result: any = await response.json(); const text = result.choices?.map((choice: any) => choice.message?.content || "").join("\n") || "";
  if (!json) return text;
  try { return JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")); } catch { throw new Error("Provider returned invalid JSON"); }
}

async function api(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (url.pathname === "/api") { const yaml = (req.headers.accept || "").includes("yaml") || url.searchParams.get("format") === "yaml"; return send(res, 200, yaml ? openapiYAML : openapiJSON, yaml ? "application/yaml; charset=utf-8" : "application/json; charset=utf-8", { "cache-control": cacheControl }); }
  const parts = url.pathname.split("/").filter(Boolean); if (parts[0] !== "api") return false;
  if (parts[1] === "fn" && parts.length === 2 && req.method === "GET") { const owner = await profileId(req); const rows = await database.all(`SELECT f.id AS function_id, f.active_version AS version, v.name, v.output FROM functions f JOIN function_versions v ON v.function_id = f.id AND v.version = f.active_version WHERE f.owner_id = ? OR f.owner_id IS NULL`, [owner]); return send(res, 200, rows.map((row) => ({ functionId: row.function_id, version: Number(row.version), name: row.name, output: row.output }))); }
  if (parts[1] === "fn" && parts.length === 2 && req.method === "POST") return saveFunction(req, res);
  if (parts[1] === "fn" && uuid.test(parts[2] || "")) { const id = parts[2]; const versionValue = parts[3] ? Number(parts[3]) : undefined; const invalidVersion = parts[3] !== undefined && (!Number.isInteger(versionValue) || (versionValue ?? 0) < 1); if (parts.length > 4 || invalidVersion) return error(res, 400, "INVALID_VERSION", "Invalid function version"); if (req.method === "GET") { const found = await getVersion(id, versionValue); return found ? send(res, 200, found) : error(res, 404, "VERSION_NOT_FOUND", "Function version not found"); } if (req.method === "PUT" && versionValue === undefined) return saveFunction(req, res, id); if (req.method === "DELETE" && versionValue === undefined) { const result = await database.run(`DELETE FROM functions WHERE id = ?`, [id]); return result ? res.writeHead(204).end() : error(res, 404, "FUNCTION_NOT_FOUND", "Function not found"); } }
  if (parts[1] === "run" && uuid.test(parts[2] || "") && req.method === "POST") { const fn = await getVersion(parts[2], url.searchParams.get("version") ? Number(url.searchParams.get("version")) : undefined); if (!fn) return error(res, 404, "VERSION_NOT_FOUND", "Function version not found"); try { const raw = await body(req); let input: unknown = raw; try { input = JSON.parse(raw).inputs ?? {}; } catch {} const output = await complete(fn, input); return send(res, 200, output, fn.output === "json" ? "application/json; charset=utf-8" : "text/plain; charset=utf-8", { "x-aifn-function-id": fn.functionId, "x-aifn-version": String(fn.version), "cache-control": "no-store" }); } catch (cause) { return error(res, 502, "PROVIDER_ERROR", cause instanceof Error ? cause.message : "Provider request failed"); } }
  return false;
}

async function staticFile(_req: IncomingMessage, res: ServerResponse, url: URL) {
  const dist = join(root, "dist");
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const candidate = normalize(join(dist, requested));
  if (!candidate.startsWith(dist)) return error(res, 403, "FORBIDDEN", "Forbidden");
  const file = extname(candidate) ? candidate : join(dist, "index.html");
  try {
    const info = await stat(file);
    if (!info.isFile()) return false;
    const mime: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".webmanifest": "application/manifest+json; charset=utf-8", ".svg": "image/svg+xml" };
    const extension = extname(file);
    const shouldRevalidate = [".html", ".js", ".css", ".webmanifest"].includes(extension) || file.endsWith("/sw.js");
    res.writeHead(200, { "content-type": mime[extension] || "application/octet-stream", "cache-control": shouldRevalidate ? revalidateControl : cacheControl });
    createReadStream(file).pipe(res);
    return true;
  } catch {
    return false;
  }
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => { try { const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`); if (req.method === "OPTIONS") { res.writeHead(204, { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS", "access-control-allow-headers": "content-type,authorization" }).end(); return; } if (url.pathname.startsWith("/api")) { if (await api(req, res, url)) return; return error(res, 404, "NOT_FOUND", "API route not found"); } if (await staticFile(req, res, url)) return; error(res, 404, "NOT_FOUND", "Not found"); } catch (cause) { error(res, 500, "INTERNAL_ERROR", cause instanceof Error ? cause.message : "Internal server error"); } });
server.listen(port, "0.0.0.0", () => console.log(`aifn.run listening on ${port}`));
