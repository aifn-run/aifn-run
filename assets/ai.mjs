/**
 * @typedef FnOptions
 * @property {String} p         Function prompt
 * @property {String} name      Function name (used to generate code)
 * @property {String} [model]   AI model
 */

const config = {};

/**
 * Create a new AI function
 *
 * @param {FnOptions} fnOptions
 * @returns {function(Record<string,string> inputs): Promise<string>}   AI powered async function
 */
async function fn(fnOptions) {
  const create = await fetch("/fn", { method: "POST", body: JSON(fnOptions) });

  if (!create.ok) {
    throw new Error(create.status);
  }

  const { uid } = await create.json();

  return (inputs) => call(uid, inputs);
}

async function configure(key) {
  const c = await fetch("https://aifn.run/conf/" + key);
  const conf = await c.json();
  Object.assign(config, conf);
}

async function call(uid, inputs) {
  const call = await fetch("/run/" + uid, {
    method: "POST",
    body: JSON.stringify(inputs),
  });

  if (!call.ok) {
    throw new Error(call.status);
  }

  return await call.text();
}

export default { fn, call, configure };
