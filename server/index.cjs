const baseUrl = process.env.STORE_URL;
const apiKey = process.env.API_KEY;
const apiUrl = process.env.API_URL;
const apiModel = process.env.API_MODEL;
const authUrl = process.env.AUTH_URL;
const systemMessage = process.env.SYSTEM_MESSAGE;

const fetchOptions = { mode: 'cors' };
const fetchHeaders = { headers: { 'content-type': 'application/json' } };
const idIsMissingError = new Error('Id is missing');
const { request } = require('https');
const crypto = require('crypto');
const uuidRe = /^.{8}-.{4}-.{4}-.{4}-.{12}$/;
const completionOptions = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + apiKey,
  },
};

class Resource {
  constructor(name) {
    if (!name) {
      throw new Error('Resource name is missing');
    }

    this.resourceUrl = new URL(`${name}/`, baseUrl).toString();
  }

  async list(filters = null) {
    const res = await fetch(this.resourceUrl, fetchOptions);

    if (!res.ok) {
      return [];
    }

    const all = await res.json();
    if (!filters) {
      return all;
    }

    const f = Object.entries(filters);
    let filtered = all;

    while (filtered.length && f.length) {
      const [key, value] = f.shift();
      filtered = filtered.filter((next) => next[key] == value);
    }

    return filtered;
  }

  async get(id = '') {
    if (!id) {
      throw idIsMissingError;
    }

    const url = new URL(id, this.resourceUrl);
    const x = await fetch(url, fetchOptions);

    return x.json();
  }

  async remove(id = '') {
    if (!id) {
      throw idIsMissingError;
    }

    const url = new URL(id, this.resourceUrl);
    const res = await fetch(url, { ...fetchOptions, method: 'DELETE' });

    return res.ok;
  }

  async set(id, payload = {}) {
    const url = new URL(id, this.resourceUrl);
    const res = await fetch(url, {
      ...fetchOptions,
      ...fetchHeaders,
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return true;
    }

    throw new Error(res.status);
  }
}

const fn = new Resource('fn');
const settings = new Resource('settings');
const history = new Resource('history');
const logs = new Resource('log');

function log(...args) {
  const time = Date.now();
  const body = args.map(String);
  const uid = crypto.randomUUID();
  console.log(...args);
  logs.set(uid, { uid, time, body: args.length > 1 ? body : body[0] });
}

function readBody(stream) {
  return new Promise((resolve) => {
    const a = [];
    stream.on('data', (c) => a.push(c));
    stream.on('end', () => {
      const buffer = Buffer.concat(a).toString('utf-8');
      resolve(buffer);
    });
  });
}

function getProfile(cookie) {
  return new Promise((resolve, reject) => {
    const r = request(authUrl, { headers: { cookie } });

    r.on('response', async (res) => {
      if (res.statusCode !== 200) return reject();
      const profile = JSON.parse(await readBody());
      resolve(profile);
    });
    r.on('error', reject);
    r.end();
  });
}

function getFunctionCode(req, res) {
  const uid = req.url.replace('/fn/', '');

  if (!uid || !uuidRe.test(uid)) {
    res.writeHead(400).end('Invalid UID');
  }

  const code = `import ai from 'https://aifn.run/ai.js'; export default (inputs) => ai.call('${uid}', inputs);`;

  res.writeHead(200, {
    'Content-Type': 'text/javascript',
    'Content-Length': code.length,
    'Cache-Control': 'max-age=604800, must-revalidate',
    'Access-Control-Allow-Origin': '*',
  });

  res.end(code.trim());
}

async function saveFunction(uid, req, res) {
  const buffer = await readBody(req);

  try {
    const body = JSON.parse(buffer);

    if (!body.p) {
      res.writeHead(400);
      res.end('Invalid input: p');
      return;
    }

    const { p, model = '', name = '' } = body;
    const hash = crypto
      .createHash('sha256')
      .update(p + model + name)
      .digest('hex');

    const list = await fn.list({ hash });

    if (list.length) {
      uid = list[0].uid;
    } else {
      const payload = { p, model, name, hash, uid };
      await fn.set(uid, payload);
    }

    res.writeHead(200);
    res.end(JSON.stringify({ uid }));
  } catch (error) {
    res.writeHead(500);
    res.end('Oh, snafu!');
    log(buffer, error);
  }
}

function replaceMarkers(text, input) {
  return text.replace(/\{([\s\S]+?)\}/g, (_, item) => input[item.trim() || '']);
}

async function fetchCompletion(functionPrompt, input, model) {
  return new Promise((resolve, reject) => {
    const remote = request(apiUrl, completionOptions);
    const content = replaceMarkers(functionPrompt, input);
    const payload = {
      model,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content },
      ],
    };

    remote.on('error', (error) => {
      log(input, model, error);
      reject();
    });

    remote.on('response', async (ai) => {
      const buffer = await readBody(ai);

      if (ai.statusCode !== 200) {
        reject();
        log(`${ai.statusCode}: ${ai.statusMessage}`, buffer);
        return;
      }

      const json = JSON.parse(buffer);
      const text = json.choices[0].message.content;
      resolve(text);
      history.set(crypto.randomInt(), { uid, input: content, output: text });
    });

    remote.write(JSON.stringify(payload));
    remote.end();
  });
}

async function runFunction(req, res) {
  const uid = req.url.replace('/run/', '');

  if (!uid || !uuidRe.test(uid)) {
    res.writeHead(400);
    res.end('Invalid uuid');
    return;
  }

  try {
    const item = await fn.get(uid);
    const input = await readBody(req);
    log(input, item);
    const json = JSON.parse(input);
    const message = await fetchCompletion(item.p, json.inputs, item.model || apiModel);
    res.end(message);
    log(message);
  } catch (error) {
    res.writeHead(500);
    res.end('Oh, shoot!');
    log(uid, error);
  }
}

async function getSettings(req, res) {
  try {
    const profile = await getProfile(req.headers.cookie);
    return settings.get(profile.id);
  } catch (error) {
    res.writeHead(500);
    res.end('Ah, crackers!');
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
    res.end('Ah, crackers!');
    log(buffer, error);
  }
}

module.exports = function (req, res, next) {
  const { url, method } = req;

  if (url.startsWith('/fn/') && method === 'GET') {
    return getFunctionCode(req, res);
  }

  if (method === 'POST' && (url === '/fn' || url === '/fn/')) {
    return saveFunction(crypto.randomUUID(), req, res);
  }

  if (method === 'PUT' && url.startsWith('/fn/') && uuidRe.test(url.slice(4))) {
    return saveFunction(url.slice(4), req, res);
  }

  if (method === 'POST' && url.startsWith('/run/')) {
    return runFunction(req, res);
  }

  if (url === '/settings') {
    if (method === 'GET') return getSettings(req, res);
    if (method === 'PUT') return saveSettings(req, res);
  }

  next();
};
