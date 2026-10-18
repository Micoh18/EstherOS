import type { I18nKey } from "@/shared/i18n";

/** Contexts in which an action is active. See the keyboard shortcuts spec. */
export const SCOPES = [
  "global",
  "today",
  "calendar",
  "journal",
  "editor",
  "todo",
  "todo.row",
  "todo.detail",
  "dialog",
] as const;

export type Scope = (typeof SCOPES)[number];

/** Screen scopes may share bindings among themselves; overlays shadow everything below them. */
export const SCREEN_SCOPES: readonly Scope[] = ["today", "calendar", "journal", "todo"];

export interface ActionDef {
  id: string;
  scopes: readonly Scope[];
  labelKey: I18nKey;
  /** Normalized binding; chords are steps separated by a space (`"G T"`). */
  defaultBinding: string | null;
  remappable: boolean;
  /** Uses the effective binding of another action unless the user sets its own. */
  inheritsFrom?: string;
  /** True when the binding is a key sequence (`G` then `T`). */
  chord?: boolean;
}

const def = <const Id extends string>(
  id: Id,
  scopes: readonly Scope[],
  defaultBinding: string | null,
  remappable: boolean,
  extra: Pick<ActionDef, "inheritsFrom" | "chord"> = {},
) => ({
  id,
  scopes,
  labelKey: `hotkeys.action.${id}` as I18nKey,
  defaultBinding,
  remappable,
  ...extra,
});

const ROW_AND_DETAIL: readonly Scope[] = ["todo.row", "todo.detail"];

export const ACTIONS = [
  // Global
  def("nav.today", ["global"], "Ctrl+1", true),
  def("nav.calendar", ["global"], "Ctrl+2", true),
  def("nav.journal", ["global"], "Ctrl+3", true),
  def("nav.todo", ["global"], "Ctrl+4", true),
  def("nav.settings", ["global"], "Ctrl+5", true),
  def("app.openSettings", ["global"], "Ctrl+Comma", true),
  def("app.newItem", ["global"], "Ctrl+N", true),
  def("theme.cycle", ["global"], "Ctrl+Shift+T", true),
  def("app.toggleSidebar", ["global"], "Ctrl+B", true),
  def("app.showShortcuts", ["global"], "Ctrl+Slash", true),
  def("app.escape", ["global"], "Escape", false),

  // Calendar
  def("calendar.goToToday", ["calendar"], "T", true),
  def("calendar.prev", ["calendar"], "ArrowLeft", true),
  def("calendar.next", ["calendar"], "ArrowRight", true),
  def("calendar.viewMonth", ["calendar"], "M", true),
  def("calendar.viewWeek", ["calendar"], "W", true),
  def("calendar.viewDay", ["calendar"], "D", true),
  def("calendar.newEvent", ["calendar"], "N", true),
  def("calendar.openJournal", ["calendar"], "J", true),
  def("calendar.togglePanel", ["calendar"], "P", true),

  // Journal
  def("journal.newEntry", ["journal"], null, true, { inheritsFrom: "app.newItem" }),
  def("journal.search", ["journal"], "Ctrl+F", true),
  def("journal.toggleFavorite", ["journal"], "Ctrl+D", true),
  def("journal.prevEntry", ["journal"], "Alt+ArrowLeft", true),
  def("journal.nextEntry", ["journal"], "Alt+ArrowRight", true),
  def("journal.goToToday", ["journal"], "Ctrl+T", true),
  def("journal.mood1", ["journal"], "Ctrl+Alt+1", true),
  def("journal.mood2", ["journal"], "Ctrl+Alt+2", true),
  def("journal.mood3", ["journal"], "Ctrl+Alt+3", true),
  def("journal.mood4", ["journal"], "Ctrl+Alt+4", true),
  def("journal.mood5", ["journal"], "Ctrl+Alt+5", true),

  // Editor (Tiptap owns the behavior; listed so the editor scope claims them)
  def("editor.bold", ["editor"], "Ctrl+B", false),
  def("editor.italic", ["editor"], "Ctrl+I", false),
  def("editor.underline", ["editor"], "Ctrl+U", false),
  def("editor.strike", ["editor"], "Ctrl+Shift+S", false),
  def("editor.heading2", ["editor"], "Ctrl+Alt+2", false),
  def("editor.heading3", ["editor"], "Ctrl+Alt+3", false),
  def("editor.bulletList", ["editor"], "Ctrl+Shift+8", false),
  def("editor.orderedList", ["editor"], "Ctrl+Shift+7", false),
  def("editor.taskList", ["editor"], "Ctrl+Shift+9", false),
  def("editor.blockquote", ["editor"], "Ctrl+Shift+B", false),
  def("editor.link", ["editor"], "Ctrl+K", false),
  def("editor.undo", ["editor"], "Ctrl+Z", false),
  def("editor.redo", ["editor"], "Ctrl+Y", false),
  def("editor.exitToTitle", ["editor"], "Escape", false),

  // Todo
  def("todo.quickAdd", ["todo"], "Slash", true),
  def("todo.newTask", ["todo"], null, true, { inheritsFrom: "app.newItem" }),
  def("todo.newList", ["todo"], "Ctrl+Shift+N", true),
  def("todo.viewToday", ["todo"], "G T", true, { chord: true }),
  def("todo.viewUpcoming", ["todo"], "G U", true, { chord: true }),
  def("todo.viewOverdue", ["todo"], "G O", true, { chord: true }),
  def("todo.viewAll", ["todo"], "G A", true, { chord: true }),
  def("todo.focusPrev", ["todo.row"], "ArrowUp", false),
  def("todo.focusNext", ["todo.row"], "ArrowDown", false),
  def("todo.toggleDone", ["todo.row"], "Space", true),
  def("todo.openDetail", ["todo.row"], "Enter", false),
  def("todo.delete", ["todo.row"], "Delete", true),
  def("todo.moveUp", ["todo.row"], "Alt+ArrowUp", true),
  def("todo.moveDown", ["todo.row"], "Alt+ArrowDown", true),
  def("todo.priorityHigh", ROW_AND_DETAIL, "1", true),
  def("todo.priorityMedium", ROW_AND_DETAIL, "2", true),
  def("todo.priorityLow", ROW_AND_DETAIL, "3", true),
  def("todo.priorityNone", ROW_AND_DETAIL, "0", true),
  def("todo.dueToday", ROW_AND_DETAIL, "Shift+T", true),
  def("todo.dueTomorrow", ROW_AND_DETAIL, "Shift+M", true),
  def("todo.dueClear", ROW_AND_DETAIL, "Shift+0", true),
  def("todo.closeDetail", ["todo.detail"], "Escape", false),

  // Today
  def("today.newTask", ["today"], null, true, { inheritsFrom: "app.newItem" }),
  def("today.openJournal", ["today"], "J", true),
  def("today.openCalendar", ["today"], "C", true),
] as const satisfies readonly ActionDef[];

export type ActionId = (typeof ACTIONS)[number]["id"];

const ACTIONS_BY_ID: ReadonlyMap<string, ActionDef> = new Map(
  ACTIONS.map((action) => [action.id, action as ActionDef]),
);

export function isActionId(id: string): id is ActionId {
  return ACTIONS_BY_ID.has(id);
}

export function getAction(id: ActionId): ActionDef {
  const action = ACTIONS_BY_ID.get(id);
  if (!action) throw new Error(`Unknown hotkey action: ${id}`);
  return action;
}

export function listActions(): readonly ActionDef[] {
  return ACTIONS;
}
