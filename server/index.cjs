const baseUrl = process.env.STORE_URL;
const fetchOptions = { mode: "cors" };
const fetchHeaders = { headers: { "content-type": "application/json" } };
const idIsMissingError = new Error("Id is missing");
const { request } = require("https");
const crypto = require("crypto");
const uuidRe = /^.{8}-.{4}-.{4}-.{4}-.{12}$/;
const completionOptions = {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer " + apiKey,
  },
};

class Resource {
  constructor(name) {
    if (!name) {
      throw new Error("Resource name is missing");
    }

    this.resourceUrl = new URL(`${name}/`, baseUrl).toString();
  }

  async list() {
    const res = await fetch(this.resourceUrl, fetchOptions);

    if (res.ok) {
      return res.json();
    }

    return [];
  }

  async get(id = "") {
    if (!id) {
      throw idIsMissingError;
    }

    const url = new URL(id, this.resourceUrl);
    const x = await fetch(url, fetchOptions);

    return x.json();
  }

  async remove(id = "") {
    if (!id) {
      throw idIsMissingError;
    }

    const url = new URL(id, this.resourceUrl);
    const res = await fetch(url, { ...fetchOptions, method: "DELETE" });

    return res.ok;
  }

  async set(id, payload = {}) {
    const url = new URL(id, this.resourceUrl);
    const res = await fetch(url, {
      ...fetchOptions,
      ...fetchHeaders,
      method: "PUT",
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return true;
    }

    throw new Error(res.status);
  }
}

const fn = new Resource("fn");

function readBody(stream) {
  return new Promise((resolve) => {
    const a = [];
    stream.on("data", (c) => a.push(c));
    stream.on("end", () => {
      const buffer = Buffer.concat(a).toString("utf-8");
      resolve(buffer);
    });
  });
}

function getFunctionCode(req, res) {
  const uid = req.url.replace("/fn/", "");

  if (!uid || !uuidRe.test(uid)) {
    res.writeHead(400).end("Invalid UID");
  }

  const code = `import ai from 'https://aifn.run/ai.js'; export default (inputs) => ai.call('${uid}', inputs);`;

  res.writeHead(200, {
    "Content-Type": "text/javascript",
    "Content-Length": code.length,
    "Cache-Control": "max-age=604800, must-revalidate",
    "Access-Control-Allow-Origin": "*",
  });

  res.end(code.trim());
}

async function createFunction(req, res) {
  const buffer = readBody(req);

  try {
    const body = JSON.parse(buffer);

    if (!body.p) {
      res.writeHead(400);
      res.end("Invalid input: p");
      return;
    }

    const uid = crypto.randomUUID();
    const payload = { p: body.p, model: body.model };
    await fn.set(uid, payload);
    res.writeHead(200);
    res.end(JSON.stringify({ uid }));
  } catch (error) {
    res.writeHead(500);
    res.end("Oh, snafu!");
    console.log(buffer);
    console.log(error);
  }
}

function replaceMarkers(text, input) {
  return text.replace(/\{([\s\S]+?)\}/g, (_, item) => input[item.trim() || ""]);
}

async function fetchCompletion(functionPrompt, input) {
  return new Promise((resolve, reject) => {
    const remote = request(
      "https://api.openai.com/v1/chat/completions",
      completionOptions
    );

    const payload = {
      model: process.env.API_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant. Don't explain and be very brief.",
        },
        { role: "user", content: replaceMarkers(functionPrompt, input) },
      ],
    };

    remote.on("response", (ai) => {
      const buffer = readBody(ai);
      const json = JSON.parse(buffer);

      resolve(json.choices[0].message.content);
    });

    remote.write(JSON.stringify(payload));
    remote.end();
  });
}

async function runFunction(req, res) {
  const uid = req.url.replace("/run/", "");

  if (!uid || !uuidRe.test(uid)) {
    res.writeHead(400);
    res.end("Invalid uuid");
    return;
  }

  try {
    const item = await fn.get(uid);
    const input = await readBody(req);
    const json = JSON.parse(input);
    const message = fetchCompletion(item.p, json);

    res.end(message);
  } catch (error) {
    res.writeHead(500);
    res.end("Oh, shoot!");
    console.log(buffer);
    console.log(error);
  }
}

module.exports = function (req, res, next) {
  const { url, method } = req;

  if (url.startsWith("/fn/") && method === "GET") {
    return getFunctionCode(req, res);
  }

  if (method === "POST" && (url === "/fn" || url === "/fn/")) {
    return createFunction(req, res);
  }

  if (method === "POST" && url.startsWith("/run/")) {
    return runFunction(req, res);
  }

  next();
};

function init() {}

init();
