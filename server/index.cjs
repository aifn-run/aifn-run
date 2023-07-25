const { randomUUID } = require("crypto");
const { request } = require("https");
const Resource = require("./resource.cjs");
const fetchCompletion = require("./completions.cjs");
const { readBody, log, onError } = require("./utils.cjs");

const authUrl = process.env.AUTH_URL;
const uuidRe = /^.{8}-.{4}-.{4}-.{4}-.{12}$/;

const functions = new Resource("fn");
const settings = new Resource("settings");

function getProfile(cookie) {
  return new Promise((resolve, reject) => {
    const r = request(authUrl, { headers: { cookie } });

    r.on("error", reject);
    r.on("response", async (res) => {
      if (res.statusCode !== 200) {
        return reject();
      }

      const profile = JSON.parse(await readBody(res));
      resolve(profile);
    });
    r.end();
  });
}

function getFunctionCode(req, res) {
  const uid = req.url.replace("/fn/", "").replace(".js", "");

  if (!uid || !uuidRe.test(uid)) {
    res.writeHead(400).end("Invalid UID");
  }

  const code = `import ai from 'https://aifn.run/ai.js';export default (inputs) => ai.call('${uid}', inputs);`;

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
      res.writeHead(400);
      res.end("Invalid input: p");
      return;
    }

    const { p, model = "", name = "" } = body;
    const hash = crypto
      .createHash("sha256")
      .update(p + model + name + oid)
      .digest("hex");

    const list = await functions.list({ hash });

    if (list.length) {
      uid = list[0].uid;
    } else {
      const payload = { p, model, name, hash, uid, oid };
      await functions.set(uid, payload);
    }

    res.writeHead(200);
    res.end(JSON.stringify({ uid }));
  } catch (error) {
    res.writeHead(500);
    res.end("Oh, snafu!");
    onError(error);
    log(buffer, error);
  }
}

async function runFunction(req, res) {
  const uid = req.url.replace("/run/", "");

  res.setHeader("Access-Control-Allow-Origin", "*");

  if (!uid || !uuidRe.test(uid)) {
    res.writeHead(400);
    res.end("Invalid uuid");
    return;
  }

  try {
    const fn = await functions.get(uid);
    const input = await readBody(req);
    log(input, fn);
    const json = JSON.parse(input);
    const message = await fetchCompletion(fn, json.inputs);
    res.end(message);
    log(message);
  } catch (error) {
    res.writeHead(500);
    res.end("Oh, shoot!");
    onError(error);
    log(uid, error);
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
    return settings.get(profile.id);
  } catch (error) {
    res.writeHead(500);
    res.end("Ah, crackers!");
    onError(error);
  }
}

async function saveSettings(req, res) {
  const buffer = await readBody(req);

  try {
    const body = JSON.parse(buffer);
    const profile = await getProfile(req.headers.cookie);
    const userId = profile.id;
    settings.set(userId, body);
  } catch (error) {
    res.writeHead(500);
    res.end("Ah, crackers!");
    onError(error);
    log(buffer, error);
  }
}

module.exports = function (req, res, next) {
  const { method } = req;
  const url = req.url.replace(/\/$/, "");

  if (url === "/fn") {
    if (method === "POST") return saveFunction(randomUUID(), req, res);
    if (method === "GET") return listFunctions(req, res);
  }

  if (url.startsWith("/fn")) {
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

  if (url.startsWith("/run/") && method === "POST") {
    return runFunction(req, res);
  }

  if (url === "/settings") {
    if (method === "GET") return getSettings(req, res);
    if (method === "PUT") return saveSettings(req, res);
  }

  next();
};
