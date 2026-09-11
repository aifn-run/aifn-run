import { createHash, randomBytes, randomUUID } from 'node:crypto';

type Profile = { id: string; name?: string; email?: string; photo?: string };
type Database = { get(sql: string, data?: unknown): Promise<any>; run(sql: string, data?: unknown): Promise<any> };
type RequestLike = { headers: { cookie?: string; get?: (name: string) => string | null } };

const provider = process.env.AUTH_PROVIDER || 'https://auth.aifn.run';
const api = process.env.AUTH_API_URL || 'https://auth.api.apphor.de';
const clientId = process.env.OIDC_CLIENT_ID;
const clientSecret = process.env.OIDC_CLIENT_SECRET;
const sessionCookie = 'aifn.sid';
const sessionDays = 30;

function cookieValue(request: RequestLike) {
  const header = request.headers.get?.('cookie') || request.headers.cookie || '';
  return header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${sessionCookie}=`))?.slice(sessionCookie.length + 1) || '';
}
function hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
function base64url(value: Buffer) { return value.toString('base64url'); }
function safeReturnTo(value: string | null | undefined) { return value && value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard'; }

export function createAuth(database: Database) {
  async function session(request: RequestLike): Promise<Profile | null> {
    const id = cookieValue(request);
    if (!id) return null;
    const row = await database.get(`SELECT profile FROM auth_sessions WHERE id = ? AND expires_at > ?`, [hash(id), Date.now()]);
    if (!row) return null;
    return JSON.parse(row.profile);
  }

  async function property(request: RequestLike, key: string) {
    const profile = await session(request);
    if (!profile) return null;
    const cookie = request.headers.get?.('cookie') || request.headers.cookie || '';
    const response = await fetch(new URL(`/properties/${encodeURIComponent(key)}`, api), { headers: { cookie } });
    return response.ok ? response.json() : null;
  }

  async function setProperty(request: RequestLike, key: string, value: string) {
    if (!(await session(request))) throw new Error('Authentication required');
    const cookie = request.headers.get?.('cookie') || request.headers.cookie || '';
    const response = await fetch(new URL('/properties', api), { method: 'PUT', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ key, value }) });
    if (!response.ok) throw new Error(`Auth property save failed: ${response.status}`);
  }

  async function login(returnTo: string, redirectUri: string) {
    if (!clientId || !clientSecret) throw new Error('OIDC_CLIENT_ID and OIDC_CLIENT_SECRET are required');
    const state = base64url(randomBytes(32));
    const verifier = base64url(randomBytes(32));
    const url = new URL('/authorize', provider);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', base64url(createHash('sha256').update(verifier).digest()));
    url.searchParams.set('code_challenge_method', 'S256');
    await database.run(`INSERT INTO oidc_states (state, verifier, return_to, expires_at) VALUES (?, ?, ?, ?)`, [state, verifier, safeReturnTo(returnTo), Date.now() + 10 * 60 * 1000]);
    return String(url);
  }

  async function callback(code: string, state: string, redirectUri: string) {
    if (!clientId || !clientSecret) throw new Error('OIDC credentials are required');
    const saved = await database.get(`SELECT verifier, return_to FROM oidc_states WHERE state = ? AND expires_at > ?`, [state, Date.now()]);
    if (!saved) throw new Error('Invalid or expired OIDC state');
    await database.run(`DELETE FROM oidc_states WHERE state = ?`, [state]);
    const form = new URLSearchParams({ grant_type: 'authorization_code', code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, code_verifier: saved.verifier });
    const token = await fetch(new URL('/token', provider), { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: form });
    if (!token.ok) throw new Error(`OIDC token exchange failed: ${token.status}`);
    const tokens = await token.json();
    const user = await fetch(new URL('/userinfo', provider), { headers: { authorization: `Bearer ${tokens.access_token}`, 'x-auth-audience': clientId } });
    if (!user.ok) throw new Error(`OIDC userinfo request failed: ${user.status}`);
    const profile: Profile = await user.json();
    const id = randomUUID();
    await database.run(`INSERT INTO auth_sessions (id, profile, expires_at, created_at) VALUES (?, ?, ?, ?)`, [hash(id), JSON.stringify(profile), Date.now() + sessionDays * 86400000, new Date().toISOString()]);
    return { id, returnTo: safeReturnTo(saved.return_to) };
  }

  async function logout(request: RequestLike) {
    const id = cookieValue(request);
    if (id) await database.run(`DELETE FROM auth_sessions WHERE id = ?`, [hash(id)]);
  }

  return { provider, session, property, setProperty, login, callback, logout, sessionCookie };
}
