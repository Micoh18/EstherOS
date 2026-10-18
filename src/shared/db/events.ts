/** Tables whose changes are broadcast. `*` means "everything changed" (e.g. after an import). */
export type DbTable = "event" | "journal_entry" | "todo_list" | "task" | "tag" | "setting" | "*";

export const DB_CHANGED = "db:changed";

export interface DbChangedDetail {
  table: DbTable;
}

const bus = new EventTarget();

export function emitDbChanged(table: DbTable): void {
  bus.dispatchEvent(new CustomEvent<DbChangedDetail>(DB_CHANGED, { detail: { table } }));
}

/**
 * Subscribes to changes of `table` (or of any table with `*`). A `*` emission reaches every
 * subscriber. Returns the unsubscribe function.
 */
export function onDbChanged(table: DbTable, callback: (table: DbTable) => void): () => void {
  const listener = (event: Event) => {
    const changed = (event as CustomEvent<DbChangedDetail>).detail.table;
    if (table === "*" || changed === "*" || changed === table) callback(changed);
  };
  bus.addEventListener(DB_CHANGED, listener);
  return () => bus.removeEventListener(DB_CHANGED, listener);
}
