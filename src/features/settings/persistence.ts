import { onDbChanged } from "@/shared/db";
import { log } from "@/shared/lib/log";
import type { SettingKey, Settings } from "./model";
import { getSetting, setSetting } from "./repository";

/**
 * Glue between in-memory state (theme, sidebar, keybindings, appearance) and the `setting` table.
 * The table is the source of truth; each piece of state keeps its own localStorage copy so the
 * first render already looks right, and the database corrects it once loaded.
 */

let writeQueue: Promise<void> = Promise.resolve();

/** Bumped on every local save, so a read that started earlier never overwrites a newer change. */
const localVersions = new Map<SettingKey, number>();

/**
 * Stores a setting after the writes already queued, so quick successive changes land in order.
 * Never rejects: a failed write is logged and the in-memory value stays for this session.
 */
export function saveSetting<K extends SettingKey>(key: K, value: Settings[K]): Promise<void> {
  localVersions.set(key, (localVersions.get(key) ?? 0) + 1);
  writeQueue = writeQueue
    .then(() => setSetting(key, value))
    .catch((error: unknown) => log.warn("Could not save setting", key, error));
  return writeQueue;
}

/**
 * Reads `key` now and again whenever the whole database changes (import, wipe), calling `apply`
 * with the stored value. Read errors are logged and leave the current state alone.
 */
export function watchSetting<K extends SettingKey>(
  key: K,
  apply: (value: Settings[K]) => void,
): () => void {
  let active = true;
  const load = () => {
    const started = localVersions.get(key);
    getSetting(key).then(
      (value) => {
        // Skip stale reads: a local change saved meanwhile is newer than this value.
        if (active && localVersions.get(key) === started) apply(value);
      },
      (error: unknown) => log.warn("Could not read setting", key, error),
    );
  };
  load();
  const off = onDbChanged("setting", (table) => {
    if (table === "*") load();
  });
  return () => {
    active = false;
    off();
  };
}

export interface SettingBinding<K extends SettingKey> {
  /** Current in-memory value. */
  read: () => Settings[K];
  /** Puts a stored value into memory (and its localStorage cache). */
  apply: (value: Settings[K]) => void;
  /** Calls `onChange` with every local change; returns the unsubscribe function. */
  subscribe: (onChange: (value: Settings[K]) => void) => () => void;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Two-way binding between a store and a setting: loads the stored value (and reloads it after an
 * import), and saves every local change. Values that came from the database are not written back.
 */
export function bindSetting<K extends SettingKey>(
  key: K,
  { read, apply, subscribe }: SettingBinding<K>,
): () => void {
  let applying = false;
  let stored: Settings[K] | undefined;

  const offWatch = watchSetting(key, (value) => {
    stored = value;
    if (same(read(), value)) return;
    applying = true;
    try {
      apply(value);
    } finally {
      applying = false;
    }
  });

  const offLocal = subscribe((value) => {
    if (applying || (stored !== undefined && same(stored, value))) return;
    stored = value;
    void saveSetting(key, value);
  });

  return () => {
    offWatch();
    offLocal();
  };
}
