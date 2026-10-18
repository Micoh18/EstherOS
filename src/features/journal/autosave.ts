export const AUTOSAVE_DELAY_MS = 800;
export const AUTOSAVE_RETRY_MS = 5000;

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

export interface AutosaverOptions {
  /** Persists the latest state. Reads it itself, so the autosaver stays data-agnostic. */
  save: () => Promise<void>;
  onStatus?: (status: SaveStatus) => void;
  delay?: number;
  retryDelay?: number;
}

export interface Autosaver {
  /** Marks the state as changed and (re)starts the debounce. */
  touch: () => void;
  /** Saves now if there are unsaved changes; waits for a save in flight. False if it failed. */
  flush: () => Promise<boolean>;
  /** Drops unsaved changes and timers (e.g. the entry was deleted). */
  cancel: () => void;
  hasPendingChanges: () => boolean;
}

/**
 * Debounced, serialized saver: one save at a time, the last change always wins, and a failed
 * save keeps the changes and retries every `retryDelay` ms until it succeeds.
 */
export function createAutosaver({
  save,
  onStatus,
  delay = AUTOSAVE_DELAY_MS,
  retryDelay = AUTOSAVE_RETRY_MS,
}: AutosaverOptions): Autosaver {
  let dirty = false;
  let running: Promise<void> | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  const clearTimers = () => {
    clearTimeout(debounceTimer);
    clearTimeout(retryTimer);
    debounceTimer = retryTimer = undefined;
  };

  async function flush(): Promise<boolean> {
    clearTimers();
    while (running) await running.catch(() => undefined);
    if (!dirty) return true;

    dirty = false;
    onStatus?.("saving");
    const current = save();
    running = current;
    try {
      await current;
      onStatus?.(dirty ? "pending" : "saved");
      return true;
    } catch {
      dirty = true;
      onStatus?.("error");
      clearTimeout(retryTimer);
      retryTimer = setTimeout(() => void flush(), retryDelay);
      return false;
    } finally {
      running = null;
    }
  }

  return {
    touch() {
      dirty = true;
      onStatus?.("pending");
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => void flush(), delay);
    },
    flush,
    cancel() {
      dirty = false;
      clearTimers();
    },
    hasPendingChanges: () => dirty,
  };
}
