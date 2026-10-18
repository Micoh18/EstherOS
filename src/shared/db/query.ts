import type { z } from "zod";
import { log } from "@/shared/lib/log";
import { getDbExecutor, type ExecuteResult, type SqlValue, type Statement } from "./executor";

/**
 * Runs a SELECT and validates every row with `schema`. Invalid rows are logged and dropped so
 * a corrupt row never breaks a screen.
 */
export async function select<S extends z.ZodType>(
  sql: string,
  params: SqlValue[],
  schema: S,
): Promise<z.output<S>[]> {
  const rows = await getDbExecutor().select(sql, params);
  const valid: z.output<S>[] = [];
  for (const row of rows) {
    const parsed = schema.safeParse(row);
    if (parsed.success) valid.push(parsed.data);
    else log.warn("Dropping invalid row", { sql, row, issues: parsed.error.issues });
  }
  return valid;
}

export async function selectOne<S extends z.ZodType>(
  sql: string,
  params: SqlValue[],
  schema: S,
): Promise<z.output<S> | null> {
  const rows = await select(sql, params, schema);
  return rows[0] ?? null;
}

export function execute(sql: string, params: SqlValue[] = []): Promise<ExecuteResult> {
  return getDbExecutor().execute(sql, params);
}

/** Write-only handle passed to `transaction`. Statements are queued and sent together. */
export interface Tx {
  execute(sql: string, params?: SqlValue[]): void;
}

/**
 * Collects the statements queued by `fn` and runs them atomically. Reads made inside `fn` go to
 * the regular connection and do not see the queued writes; read first, then queue writes.
 */
export async function transaction(fn: (tx: Tx) => void | Promise<void>): Promise<void> {
  const statements: Statement[] = [];
  await fn({
    execute(sql, params = []) {
      statements.push({ sql, params });
    },
  });
  await getDbExecutor().batch(statements);
}

/** `?, ?, ?` for an IN clause. */
export function placeholders(count: number): string {
  return Array.from({ length: count }, () => "?").join(", ");
}

/** Escapes `%`, `_` and `\` for a `LIKE ... ESCAPE '\'` pattern. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
