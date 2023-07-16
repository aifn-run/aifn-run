const baseUrl = process.env.STORE_URL;
const apiKey = process.env.API_KEY;
const apiUrl = process.env.API_URL;
const apiModel = process.env.API_MODEL;
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
      const payload = { p, model, name, hash };
      await fn.set(uid, payload);
    }

    res.writeHead(200);
    res.end(JSON.stringify({ uid }));
  } catch (error) {
    res.writeHead(500);
    res.end('Oh, snafu!');
    console.log(buffer);
    console.log(error);
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
        {
          role: 'system',
          content: "You are a helpful assistant. Don't explain and be very brief.",
        },
        { role: 'user', content },
      ],
    };

    remote.on('error', (e) => {
      console.log(e);
      reject();
    });

    remote.on('response', async (ai) => {
      const buffer = await readBody(ai);

      if (ai.statusCode !== 200) {
        console.log(ai.statusCode, ai.statusMessage, buffer);
        return reject();
      }

      const json = JSON.parse(buffer);

      resolve(json.choices[0].message.content);
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
    console.log(input, item.p);
    // TODO catch exceptions
    const json = JSON.parse(input);
    const message = fetchCompletion(item.p, json.inputs, item.model || apiModel);

    res.end(message);
  } catch (error) {
    res.writeHead(500);
    res.end('Oh, shoot!');
    console.log(error);
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

  next();
};
