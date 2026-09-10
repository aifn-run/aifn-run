import type { Migration } from './types.js';

const migration: Migration = {
  id: '004-oidc-sessions',
  async up(database) {
    await database.run(`CREATE TABLE IF NOT EXISTS oidc_states (state TEXT PRIMARY KEY, verifier TEXT NOT NULL, return_to TEXT NOT NULL, expires_at INTEGER NOT NULL)`);
    await database.run(`CREATE TABLE IF NOT EXISTS auth_sessions (id TEXT PRIMARY KEY, profile TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at TEXT NOT NULL)`);
  },
};

export default migration;
