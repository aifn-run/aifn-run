import type { Migration } from './types.js';

const migration: Migration = {
  id: '007-providers',
  async up(database) {
    await database.run(`CREATE TABLE IF NOT EXISTS providers (user_id TEXT NOT NULL, slug TEXT NOT NULL, url TEXT NOT NULL, default_model TEXT NOT NULL DEFAULT '', encrypted_key TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(user_id, slug))`);
  },
};

export default migration;
