import type { Migration } from './types.js';

const migration: Migration = {
  id: '001-initial-schema',
  async up(database) {
    await database.run(`CREATE TABLE IF NOT EXISTS functions (id TEXT PRIMARY KEY, owner_id TEXT, active_version INTEGER NOT NULL, latest_version INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`);
    await database.run(`CREATE TABLE IF NOT EXISTS function_versions (function_id TEXT NOT NULL, version INTEGER NOT NULL, prompt TEXT NOT NULL, name TEXT NOT NULL, model TEXT NOT NULL, format TEXT NOT NULL, output TEXT NOT NULL CHECK(output IN ('json', 'text')), created_at TEXT NOT NULL, PRIMARY KEY(function_id, version), FOREIGN KEY(function_id) REFERENCES functions(id) ON DELETE CASCADE)`);
  },
};

export default migration;
