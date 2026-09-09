type Profile = { id: string; name?: string; email?: string; photo?: string };

const issuer = process.env.AUTH_ISSUER || 'https://auth.aifn.run';
const api = process.env.AUTH_API_URL || 'https://auth.api.apphor.de';

async function session(request: Request): Promise<Profile | null> {
  const cookie = request.headers.get('cookie') || '';
  if (!cookie) return null;
  const response = await fetch(new URL('/', api), { headers: { cookie } });
  return response.ok ? response.json() : null;
}

async function property(request: Request, key: string) {
  const cookie = request.headers.get('cookie') || '';
  if (!cookie) return null;
  const response = await fetch(new URL(`/properties/${encodeURIComponent(key)}`, api), { headers: { cookie } });
  return response.ok ? response.json() : null;
}

async function setProperty(request: Request, key: string, value: string) {
  const cookie = request.headers.get('cookie') || '';
  if (!cookie) throw new Error('Authentication required');
  const response = await fetch(new URL('/properties', api), {
    method: 'PUT',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ key, value }),
  });
  if (!response.ok) throw new Error(`Auth property save failed: ${response.status}`);
}

export const auth = { issuer, api, session, property, setProperty };
