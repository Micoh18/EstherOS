import { invoke } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";
import type { DbExecutor, Statement } from "./executor";

/** Must match `DB_URL` in `src-tauri/src/db.rs`. File lives in the app data folder. */
export const DB_URL = "sqlite:estheros.db";

let dbPromise: Promise<Database> | null = null;

/** Singleton connection. The first call runs pending migrations. */
export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL).catch((error: unknown) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

export function createTauriExecutor(): DbExecutor {
  return {
    async select(sql, params) {
      const db = await getDb();
      return db.select<Record<string, unknown>[]>(sql, params);
    },
    async execute(sql, params) {
      const db = await getDb();
      const result = await db.execute(sql, params);
      return { rowsAffected: result.rowsAffected };
    },
    async batch(statements: Statement[]) {
      if (statements.length === 0) return;
      await getDb();
      await invoke<number>("db_batch", { statements });
    },
  };
}
