import type { Migration } from './types.js';

const migration: Migration = {
  id: '002-provider-endpoint',
  async up(database) {
    try {
      await database.run(`ALTER TABLE function_versions ADD COLUMN provider_endpoint TEXT NOT NULL DEFAULT ''`);
    } catch {}
  },
};

export default migration;
