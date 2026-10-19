import { create } from "zustand";
import {
  getAction,
  isActionId,
  listActions,
  type ActionDef,
  type ActionId,
  type Scope,
} from "./actions";
import { log } from "@/shared/lib/log";
import { formatBindingString, isReserved, normalizeBinding } from "./binding";

/** Only the actions the user changed: `{ actionId: binding | null }` (null = no shortcut). */
export type KeybindingOverrides = Partial<Record<ActionId, string | null>>;

// Cache for the first render. `setting.keybindings` is the source of truth: the app providers load
// it with `replaceOverrides` and save every change of `useKeybindingsStore` back to it.
export const KEYBINDINGS_STORAGE_KEY = "estheros.keybindings";

export type SetBindingResult =
  { ok: true } | { ok: false; reason: "notRemappable" | "invalid" | "reserved" };

interface KeybindingsState {
  overrides: KeybindingOverrides;
}

function warn(message: string, detail?: unknown) {
  log.warn(`[hotkeys] ${message}`, detail ?? "");
}

function readStoredOverrides(): KeybindingOverrides {
  try {
    const raw = globalThis.localStorage?.getItem(KEYBINDINGS_STORAGE_KEY);
    return raw ? sanitizeOverrides(JSON.parse(raw)) : {};
  } catch (error) {
    warn("could not read stored keybindings", error);
    return {};
  }
}

function writeStoredOverrides(overrides: KeybindingOverrides) {
  try {
    globalThis.localStorage?.setItem(KEYBINDINGS_STORAGE_KEY, JSON.stringify(overrides));
  } catch (error) {
    warn("could not store keybindings", error);
  }
}

export const useKeybindingsStore = create<KeybindingsState>(() => ({
  overrides: readStoredOverrides(),
}));

function commit(overrides: KeybindingOverrides) {
  useKeybindingsStore.setState({ overrides });
  writeStoredOverrides(overrides);
}

/**
 * Validates stored overrides: the id must exist and be remappable, the binding must parse and not
 * be reserved (the action's own default is always accepted). Invalid entries are dropped and logged.
 */
export function sanitizeOverrides(raw: unknown): KeybindingOverrides {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: KeybindingOverrides = {};
  for (const [id, value] of Object.entries(raw)) {
    if (!isActionId(id) || !getAction(id).remappable) {
      warn("ignoring keybinding for unknown or fixed action", id);
      continue;
    }
    if (value === null) {
      result[id] = null;
      continue;
    }
    const normalized = typeof value === "string" ? normalizeBinding(value) : null;
    if (!normalized || !isAllowedFor(getAction(id), normalized)) {
      warn("ignoring invalid keybinding", { id, value });
      continue;
    }
    result[id] = normalized;
  }
  return result;
}

function isAllowedFor(action: ActionDef, binding: string): boolean {
  return binding === action.defaultBinding || !isReserved(binding, action.scopes);
}

/** Replaces all overrides (e.g. after loading them from the settings table). */
export function replaceOverrides(raw: unknown) {
  commit(sanitizeOverrides(raw));
}

/** Binding without the user's override of this action (default or inherited). */
function getBaseBinding(id: ActionId, overrides: KeybindingOverrides): string | null {
  const action = getAction(id);
  if (action.inheritsFrom && isActionId(action.inheritsFrom)) {
    return getEffectiveBinding(action.inheritsFrom, overrides);
  }
  return action.defaultBinding;
}

/** Binding currently in force for an action: override, else inherited, else default. */
export function getEffectiveBinding(
  id: ActionId,
  overrides: KeybindingOverrides = useKeybindingsStore.getState().overrides,
): string | null {
  if (Object.hasOwn(overrides, id)) return overrides[id] ?? null;
  return getBaseBinding(id, overrides);
}

export function isCustomized(
  id: ActionId,
  overrides: KeybindingOverrides = useKeybindingsStore.getState().overrides,
): boolean {
  return Object.hasOwn(overrides, id);
}

/** Assigns a binding (null disables the shortcut). Conflicts are not checked here. */
export function setBinding(id: ActionId, binding: string | null): SetBindingResult {
  const action = getAction(id);
  if (!action.remappable) return { ok: false, reason: "notRemappable" };
  const { overrides } = useKeybindingsStore.getState();
  let normalized: string | null = null;
  if (binding !== null) {
    normalized = normalizeBinding(binding);
    if (!normalized) return { ok: false, reason: "invalid" };
    if (!isAllowedFor(action, normalized)) return { ok: false, reason: "reserved" };
  }
  const next = { ...overrides };
  // Keep only real changes so future default updates still reach untouched actions.
  if (normalized === getBaseBinding(id, overrides)) delete next[id];
  else next[id] = normalized;
  commit(next);
  return { ok: true };
}

export function resetBinding(id: ActionId) {
  const next = { ...useKeybindingsStore.getState().overrides };
  delete next[id];
  commit(next);
}

export function resetAll() {
  commit({});
}

function scopesCollide(a: readonly Scope[], b: readonly Scope[]): boolean {
  return a.some((scopeA) =>
    b.some((scopeB) => {
      if (scopeA === scopeB) return true;
      // The editor and dialogs shadow global shortcuts by design.
      const other = scopeA === "global" ? scopeB : scopeB === "global" ? scopeA : null;
      return other !== null && other !== "editor" && other !== "dialog";
    }),
  );
}

/** A chord prefix collides with the whole chord: `G` would swallow `G T`. */
function bindingsCollide(a: string, b: string): boolean {
  return a === b || a.startsWith(`${b} `) || b.startsWith(`${a} `);
}

/** Actions whose binding inherits from `id` (and has no override) follow it, so they never clash. */
function followsAction(candidate: ActionId, id: ActionId, overrides: KeybindingOverrides): boolean {
  let current: ActionDef = getAction(candidate);
  let currentId: ActionId = candidate;
  while (current.inheritsFrom && !Object.hasOwn(overrides, currentId)) {
    if (current.inheritsFrom === id) return true;
    if (!isActionId(current.inheritsFrom)) return false;
    currentId = current.inheritsFrom;
    current = getAction(currentId);
  }
  return false;
}

/**
 * Actions that already use `binding` where it would clash with `id`: same scope, or one of them
 * global. Screen scopes (calendar, todo...) may repeat bindings among themselves.
 */
export function findConflicts(
  id: ActionId,
  binding: string,
  overrides: KeybindingOverrides = useKeybindingsStore.getState().overrides,
): ActionId[] {
  const normalized = normalizeBinding(binding);
  if (!normalized) return [];
  const action = getAction(id);
  const conflicts: ActionId[] = [];
  for (const other of listActions()) {
    const otherId = other.id as ActionId;
    if (otherId === id) continue;
    if (followsAction(otherId, id, overrides) || followsAction(id, otherId, overrides)) continue;
    const otherBinding = getEffectiveBinding(otherId, overrides);
    if (!otherBinding || !bindingsCollide(normalized, otherBinding)) continue;
    if (scopesCollide(action.scopes, other.scopes)) conflicts.push(otherId);
  }
  return conflicts;
}

/** Actions active in `scope` whose effective binding is exactly `binding`. */
export function findActionsByBinding(
  scope: Scope,
  binding: string,
  overrides: KeybindingOverrides = useKeybindingsStore.getState().overrides,
): ActionId[] {
  return listActions()
    .filter((action) => action.scopes.includes(scope))
    .map((action) => action.id as ActionId)
    .filter((id) => getEffectiveBinding(id, overrides) === binding);
}

/** True when some action in `scope` is a chord that starts with `prefix`. */
export function hasChordWithPrefix(
  scope: Scope,
  prefix: string,
  overrides: KeybindingOverrides = useKeybindingsStore.getState().overrides,
): boolean {
  return listActions().some((action) => {
    if (!action.scopes.includes(scope)) return false;
    const binding = getEffectiveBinding(action.id as ActionId, overrides);
    return !!binding && binding.startsWith(`${prefix} `);
  });
}

/**
 * Display text for an action's effective binding (`formatBinding("theme.cycle")` →
 * `Ctrl+Shift+T`) or for a raw binding string (`formatBinding("alt+left")` → `Alt+←`).
 * Empty string when there is no shortcut.
 */
export function formatBinding(actionIdOrBinding: ActionId | string | null): string {
  if (actionIdOrBinding === null) return "";
  if (isActionId(actionIdOrBinding)) {
    return formatBindingString(getEffectiveBinding(actionIdOrBinding));
  }
  return formatBindingString(actionIdOrBinding);
}

/** Reactive version of `formatBinding(actionId)` for tooltips and menus. */
export function useFormattedBinding(id: ActionId): string {
  const overrides = useKeybindingsStore((state) => state.overrides);
  return formatBindingString(getEffectiveBinding(id, overrides));
}
