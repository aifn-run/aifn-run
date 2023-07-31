/**
 * @typedef FnOptions
 * @property {String} p         Function prompt
 * @property {String} name      Function name (used to generate code)
 * @property {String} [model]   AI model
 */

const config = {};
const baseURL = "https://__BASE_URL__/";

/**
 * Create a new AI function
 *
 * @param {FnOptions|String} fnOptions
 * @returns {function(Record<string,string> inputs): Promise<string>}   AI powered async function
 */
async function fn(fnOptions) {
  const uid = await create(fnOptions);
  return (inputs) => call(uid, inputs);
}

async function create(fnOptions) {
  const body = typeof fnOptions === "string" ? { p: fnOptions } : fnOptions;
  const create = await fetch(new URL("/fn", baseURL), {
    method: "POST",
    headers: { Authorization: config.key || "" },
    mode: "cors",
    body: JSON.stringify(body),
  });

  if (!create.ok) {
    throw new Error(create.status);
  }

  const { uid } = await create.json();

  return uid;
}

async function update(uid, fnOptions) {
  const body = typeof fnOptions === "string" ? { p: fnOptions } : fnOptions;
  const request = await fetch(new URL("/fn/" + uid, baseURL), {
    method: "PUT",
    headers: { Authorization: config.key || "" },
    mode: "cors",
    body: JSON.stringify(body),
  });

  if (!request.ok) {
    throw new Error(request.status);
  }

  return uid;
}

async function configure(key) {
  config.key = key;
}

async function call(uid, inputs) {
  const request = await fetch(new URL("/run/" + uid, baseURL), {
    method: "POST",
    mode: "cors",
    headers: { Authorization: config.key || "" },
    body: JSON.stringify({ inputs }),
  });

  if (!request.ok) {
    throw new Error(request.status);
  }

  return await request.text();
}

export default { fn, call, configure, create, update };
