import { readFileSync } from "fs";
import { createHash, randomUUID } from "crypto";
import { fetchCompletion } from "./completions.mjs";
import { getProfile } from "./auth.mjs";
import { Resource } from "./resource.mjs";
import { readBody, log, onError } from "./utils.mjs";

const uuidRe = /^.{8}-.{4}-.{4}-.{4}-.{12}$/;
const aiModule = readFileSync("./server/assets/ai.mjs", "utf-8");
const startDate = new Date().toUTCString();
const functions = new Resource("fn");
const settings = new Resource("settings");
const queryHistory = new Resource("history");

function getFunctionCode(req, res) {
  const uid = req.url.replace("/fn/", "").replace(".js", "");

  if (!uid || !uuidRe.test(uid)) {
    res.writeHead(400).end("Invalid UID");
  }

  const code = `import ai from 'https://aifn.run/ai.mjs';export default (inputs) => ai.call('${uid}', inputs);`;

  res.writeHead(200, {
    "Content-Type": "text/javascript",
    "Content-Length": code.length,
    "Cache-Control": "max-age=604800, must-revalidate",
    "Access-Control-Allow-Origin": "*",
  });

  res.end(code.trim());
}

async function getFunction(req, res) {
  const uid = req.url.slice(4);
  const fn = await functions.get(uid);

  if (!fn) {
    return res.writeHead(404).end("Function not found");
  }

  console.log(fn);
  const { p, model, name } = fn;
  res.writeHead(200).end(JSON.stringify({ p, model, name, uid }));
}

async function removeFunction(uid, req, res) {
  let profile = { id: "" };

  try {
    profile = await getProfile(req.headers.cookie);
  } catch {
    res.writeHead(401).send("");
    return;
  }

  const fn = await functions.get(uid);
  if (!fn || (fn.oid && fn.oid !== profile.id)) {
    res.writeHead(403).end("");
    return;
  }

  const result = await functions.remove(uid);
  res.writeHead(result ? 202 : 400).end("");
}

async function saveFunction(uid, req, res) {
  let profile = { id: "" };

  try {
    profile = await getProfile(req.headers.cookie);
  } catch {}

  const oid = profile.id ?? "";
  const buffer = await readBody(req);

  try {
    const body = JSON.parse(buffer);

    if (!body.p) {
      res.writeHead(400).end("Invalid input: p");
      return;
    }

    const { p, model = "", name = "" } = body;
    const hash = createHash("sha256")
      .update(p + model + name + oid)
      .digest("hex");

    const list = await functions.list({ hash });

    if (list.length) {
      uid = list[0].uid;
    } else {
      const payload = { p, model, name, hash, uid, oid };
      await functions.set(uid, payload);
    }

    res.writeHead(200).end(JSON.stringify({ uid }));
  } catch (error) {
    res.writeHead(500).end("Oh, snafu!");
    onError(error);
    log(buffer, error);
  }
}

async function runFunction(req, res) {
  const uid = req.url.replace("/run/", "");

  res.setHeader("Access-Control-Allow-Origin", "*");

  if (!uid || !uuidRe.test(uid)) {
    res.writeHead(400).end("Invalid uuid");
    return;
  }

  try {
    const fn = await functions.get(uid);
    const rawInputs = await readBody(req);
    log(rawInputs, fn);
    const input = parseInputs(rawInputs);
    const message = await fetchCompletion(fn, input);
    res.end(message);
    queryHistory.set(randomUUID(), { uid, input, output: message, rawInputs });
    log(message);
  } catch (error) {
    res.writeHead(500).end("Oh, shoot!");
    onError(error);
    log(uid, error);
  }
}

function parseInputs(text) {
  try {
    const json = JSON.parse(text);
    return json.inputs || {};
  } catch {
    return text.trim();
  }
}

async function listFunctions(req, res) {
  let oid = "";

  try {
    const profile = await getProfile(req.headers.cookie);
    oid = profile.id;
  } catch {}

  const all = await functions.list();
  const allowed = all.filter((it) => it.oid === oid || !it.oid);
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify(allowed));
}

async function getSettings(req, res) {
  try {
    const profile = await getProfile(req.headers.cookie);
    const value = await settings.get(profile.id);
    res.writeHead(200).end(JSON.stringify(value || {}));
  } catch (error) {
    res.writeHead(500).end("Ah, crackers!");
    onError(error);
  }
}

async function saveSettings(req, res) {
  const buffer = await readBody(req);

  try {
    const body = JSON.parse(buffer);
    const profile = await getProfile(req.headers.cookie);
    const userId = profile.id;
    await settings.set(userId, body);
  } catch (error) {
    res.writeHead(500).end("Dayum!");
    onError(error);
    log(buffer, error);
  }
}

export default function (req, res, next) {
  const { method } = req;
  const url = req.url.replace(/\/$/, "");

  if (url === "/fn") {
    if (method === "POST") return saveFunction(randomUUID(), req, res);
    if (method === "GET") return listFunctions(req, res);
  }

  if (url.startsWith("/fn")) {
    if (method === "DELETE" && uuidRe.test(url.slice(4))) {
      return removeFunction(url.slice(4), req, res);
    }

    if (method === "PUT" && uuidRe.test(url.slice(4))) {
      return saveFunction(url.slice(4), req, res);
    }

    if (method !== "GET") {
      return next();
    }

    if (url.endsWith(".js")) {
      return getFunctionCode(req, res);
    }

    return getFunction(req, res);
  }

  if (url.startsWith("/run/")) {
    if (method === "POST") return runFunction(req, res);
    if (method === "OPTIONS") {
      res.writeHead(200, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization",
        "Access-Control-Allow-Methods": "POST",
      });

      res.end();
      return;
    }
  }

  if (url === "/settings") {
    if (method === "GET") return getSettings(req, res);
    if (method === "PUT") return saveSettings(req, res);
  }

  if (url === "/ai.mjs" && method === "GET") {
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Last-Modified": startDate,
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "max-age=604800, must-revalidate",
    });
    res.end(aiModule.replace("__BASE_URL__", req.headers["x-forwarded-for"]));
    return;
  }

  console.log(`No match for ${req.method} ${req.url}`);
  next();
}
