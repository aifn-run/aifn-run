import type { Migration } from './types.js';

const migration: Migration = {
  id: '005-function-input-schema',
  async up(database) {
    try {
      await database.run(`ALTER TABLE function_versions ADD COLUMN input_schema TEXT NOT NULL DEFAULT '[]'`);
    } catch {}
  },
};

export default migration;
