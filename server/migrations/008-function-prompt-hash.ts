import type { Migration } from "./types.js";

const migration: Migration = {
  id: "008-function-prompt-hash",
  async up(database) {
    await database.run(`ALTER TABLE functions ADD COLUMN prompt_hash TEXT`);
    await database.run(
      `CREATE UNIQUE INDEX IF NOT EXISTS functions_owner_prompt_hash ON functions(owner_id, prompt_hash)`,
    );
  },
};

export default migration;
