import type { Migration } from './types.js';

const migration: Migration = {
  id: '006-provider-slug',
  async up(database) {
    try { await database.run(`ALTER TABLE function_versions ADD COLUMN provider_slug TEXT NOT NULL DEFAULT ''`); } catch {}
  },
};

export default migration;
