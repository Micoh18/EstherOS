import { readFileSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { setDbExecutor, type DbExecutor, type SqlValue } from "@/shared/db";

// Same as tests/unit/helpers/memoryDb.ts, but resolving the migration from the project root so it
// also works under jsdom (where import.meta.url is not a file URL).
const MIGRATION = join(process.cwd(), "src-tauri", "migrations", "0001_init.sql");

export interface MemoryDb {
  raw: Database.Database;
}

/** In-memory SQLite running the real migration, wired as the repositories' executor. */
export function useMemoryDb(): MemoryDb {
  const raw = new Database(":memory:");
  raw.pragma("foreign_keys = ON");
  raw.exec(readFileSync(MIGRATION, "utf8"));

  const run = (sql: string, params: SqlValue[]) => {
    const statement = raw.prepare(sql);
    if (statement.reader) return { rows: statement.all(...params), changes: 0 };
    return { rows: [], changes: statement.run(...params).changes };
  };

  const executor: DbExecutor = {
    async select(sql, params) {
      return run(sql, params).rows as Record<string, unknown>[];
    },
    async execute(sql, params) {
      return { rowsAffected: run(sql, params).changes };
    },
    async batch(statements) {
      raw.transaction(() => {
        for (const { sql, params } of statements) run(sql, params);
      })();
    },
  };

  setDbExecutor(executor);
  return { raw };
}
