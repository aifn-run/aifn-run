const config = { baseURL: globalThis.aiBaseURL || 'https://aifn.run' };

async function request(path, options = {}) {
  const response = await fetch(new URL(path, config.baseURL), { ...options, credentials: 'include', headers: { 'content-type': 'application/json', ...(options.headers || {}) } });
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
  return response;
}

async function create(options) {
  const response = await request('/api/fn', { method: 'POST', body: JSON.stringify(typeof options === 'string' ? { prompt: options } : options) });
  return (await response.json()).functionId;
}

async function update(functionId, options) {
  await request(`/api/fn/${functionId}`, { method: 'PUT', body: JSON.stringify(typeof options === 'string' ? { prompt: options } : options) });
  return functionId;
}

async function call(functionId, inputs) {
  const response = await request(`/api/run/${functionId}`, { method: 'POST', body: JSON.stringify({ inputs }) });
  return response.headers.get('content-type')?.includes('application/json') ? response.json() : response.text();
}

async function fn(options) {
  const functionId = await create(options);
  return (inputs) => call(functionId, inputs);
}

function configure(baseURL) { config.baseURL = baseURL; }

export default { fn, call, configure, create, update };
