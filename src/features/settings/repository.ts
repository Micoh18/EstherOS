import { z } from "zod";
import { emitDbChanged, execute, select, transaction } from "@/shared/db";
import { log } from "@/shared/lib/log";
import {
  SETTING_DEFAULTS,
  SettingsSchema,
  applyKeybinding,
  isSettingKey,
  parseSettingValue,
  resetKeybindingIn,
  type Keybindings,
  type SettingKey,
  type Settings,
} from "./model";

const SettingRowSchema = z.object({ key: z.string(), value_json: z.string() });

function decode<K extends SettingKey>(key: K, json: string | undefined): Settings[K] {
  if (json === undefined) return SETTING_DEFAULTS[key];
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    raw = undefined;
  }
  const value = parseSettingValue(key, raw);
  if (value === null) {
    log.warn("Invalid setting, using default", { key, json });
    return SETTING_DEFAULTS[key];
  }
  return value;
}

/** Typed value of one setting; missing or invalid rows fall back to the default. */
export async function getSetting<K extends SettingKey>(key: K): Promise<Settings[K]> {
  const [row] = await select(
    "SELECT key, value_json FROM setting WHERE key = ?",
    [key],
    SettingRowSchema,
  );
  return decode(key, row?.value_json);
}

export async function setSetting<K extends SettingKey>(key: K, value: Settings[K]): Promise<void> {
  const valid = SettingsSchema.shape[key].parse(value);
  await execute(
    `INSERT INTO setting (key, value_json) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value_json = excluded.value_json`,
    [key, JSON.stringify(valid)],
  );
  emitDbChanged("setting");
}

/** All settings, defaults filled in. Unknown keys in the table are ignored. */
export async function getAllSettings(): Promise<Settings> {
  const rows = await select("SELECT key, value_json FROM setting", [], SettingRowSchema);
  const stored = new Map(rows.map((row) => [row.key, row.value_json]));
  const result = { ...SETTING_DEFAULTS } as Record<SettingKey, unknown>;
  for (const key of Object.keys(SETTING_DEFAULTS)) {
    if (isSettingKey(key)) result[key] = decode(key, stored.get(key));
  }
  return result as Settings;
}

/** Stores a binding; picking the default again removes the override. */
export async function setKeybinding(
  actionId: string,
  binding: string | null,
  defaultBinding: string | null,
): Promise<Keybindings> {
  const next = applyKeybinding(await getSetting("keybindings"), actionId, binding, defaultBinding);
  await setSetting("keybindings", next);
  return next;
}

export async function resetKeybinding(actionId: string): Promise<Keybindings> {
  const next = resetKeybindingIn(await getSetting("keybindings"), actionId);
  await setSetting("keybindings", next);
  return next;
}

export async function resetAllKeybindings(): Promise<void> {
  await setSetting("keybindings", {});
}

// Tags -----------------------------------------------------------------------------------------

const TagUsageRowSchema = z.object({ id: z.string(), uses: z.number() });

/** How many events, journal entries and tasks use each tag, keyed by tag id. */
export async function countTagUsage(): Promise<Map<string, number>> {
  const rows = await select(
    `SELECT t.id,
       (SELECT COUNT(*) FROM event_tag WHERE tag_id = t.id)
       + (SELECT COUNT(*) FROM journal_tag WHERE tag_id = t.id)
       + (SELECT COUNT(*) FROM task_tag WHERE tag_id = t.id) AS uses
     FROM tag t`,
    [],
    TagUsageRowSchema,
  );
  return new Map(rows.map((row) => [row.id, row.uses]));
}

// Wipe -----------------------------------------------------------------------------------------

/** Children first so foreign keys never block the delete. Fixed list: names go into SQL. */
const WIPE_ORDER = [
  "event_tag",
  "journal_tag",
  "task_tag",
  "task",
  "event",
  "journal_entry",
  "tag",
  "todo_list",
  "setting",
] as const;

/**
 * Deletes every row and restores the first-run state (Inbox list, default settings), as on a
 * clean install. Every subscriber gets a `*` change.
 */
export async function wipeAllData(): Promise<void> {
  await transaction((tx) => {
    for (const table of WIPE_ORDER) tx.execute(`DELETE FROM ${table}`);
    tx.execute(
      `INSERT INTO todo_list (id, name, color, icon, sort_order, is_archived, created_at, updated_at)
       VALUES ('inbox', 'Inbox', NULL, 'inbox', 0, 0,
               strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`,
    );
  });
  emitDbChanged("*");
}
