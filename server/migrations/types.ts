export type MigrationDatabase = {
  run(sql: string, data?: unknown): Promise<unknown>;
  all(sql: string, data?: unknown): Promise<any[]>;
};

export type Migration = {
  id: string;
  up(database: MigrationDatabase): Promise<void>;
};
