import type { Migration } from './types.js';

const migration: Migration = {
  id: '003-function-visibility',
  async up(database) {
    try {
      await database.run(`ALTER TABLE functions ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0`);
    } catch {}
  },
};

export default migration;
