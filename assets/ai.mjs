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
 * @param {FnOptions|String} fnOptions
 * @returns {function(Record<string,string> inputs): Promise<string>}   AI powered async function
 */
async function fn(fnOptions) {
  const body = typeof fnOptions === 'string' ? { p: fnOptions } : fnOptions;
  const create = await fetch("/fn", {
    method: "POST",
    headers: { 'Authorization': config.key || '' },
    body: JSON.stringify(body)
  });

  if (!create.ok) {
    throw new Error(create.status);
  }

  const { uid } = await create.json();

  return (inputs) => call(uid, inputs);
}

async function configure(key) {
  config.key = key;
}

async function call(uid, inputs) {
  const call = await fetch("/run/" + uid, {
    method: "POST",
    headers: { 'Authorization': config.key || '' },
    body: JSON.stringify(inputs),
  });

  if (!call.ok) {
    throw new Error(call.status);
  }

  return await call.text();
}

export default { fn, call, configure };
