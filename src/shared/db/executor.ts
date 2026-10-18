/** A value that can be bound to a `?` placeholder. Booleans must be passed as 0/1. */
export type SqlValue = string | number | null;

export type Row = Record<string, unknown>;

export interface ExecuteResult {
  rowsAffected: number;
}

export interface Statement {
  sql: string;
  params: SqlValue[];
}

/**
 * Minimal database surface used by every repository. The app uses the Tauri SQL plugin;
 * unit tests inject a better-sqlite3 implementation running the same migration file.
 */
export interface DbExecutor {
  select(sql: string, params: SqlValue[]): Promise<Row[]>;
  execute(sql: string, params: SqlValue[]): Promise<ExecuteResult>;
  /** Runs all statements atomically (single transaction). */
  batch(statements: Statement[]): Promise<void>;
}

let injected: DbExecutor | null = null;
let fallback: (() => DbExecutor) | null = null;

/** Overrides the executor (tests). Pass `null` to go back to the default one. */
export function setDbExecutor(executor: DbExecutor | null): void {
  injected = executor;
}

/** Registers the lazily created default executor (the Tauri client registers itself). */
export function setDefaultDbExecutorFactory(factory: () => DbExecutor): void {
  fallback = factory;
}

export function getDbExecutor(): DbExecutor {
  if (injected) return injected;
  if (!fallback) throw new Error("No database executor configured");
  injected = fallback();
  return injected;
}
