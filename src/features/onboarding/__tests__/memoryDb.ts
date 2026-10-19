import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";
import { setDbExecutor, type DbExecutor, type SqlValue } from "@/shared/db";

// TODO(A3): tests/unit/helpers/memoryDb.ts resolves the migration from `import.meta.url`, which
// is not a file URL under jsdom. Same copy as the other features until the shared helper is fixed.
const MIGRATION = resolve(process.cwd(), "src-tauri/migrations/0001_init.sql");

/** In-memory SQLite running the real migration, wired as the repositories' executor. */
export function useMemoryDb(): Database.Database {
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
  return raw;
}
