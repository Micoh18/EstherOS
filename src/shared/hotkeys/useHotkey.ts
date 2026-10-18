import { useEffect, useRef } from "react";
import { create } from "zustand";
import type { ActionId, Scope } from "./actions";
import { eventToBinding, isSimpleStroke } from "./binding";
import { findActionsByBinding, hasChordWithPrefix } from "./registry";
import { getActiveScopes, isEditableTarget } from "./scope";

export type HotkeyHandler = (event: KeyboardEvent) => void;

export interface UseHotkeyOptions {
  enabled?: boolean;
}

interface HandlerEntry {
  handler: { current: HotkeyHandler };
  enabled: { current: boolean };
}

const handlers = new Map<ActionId, HandlerEntry[]>();

export function registerHandler(id: ActionId, entry: HandlerEntry): () => void {
  handlers.set(id, [...(handlers.get(id) ?? []), entry]);
  return () => {
    const remaining = (handlers.get(id) ?? []).filter((item) => item !== entry);
    if (remaining.length > 0) handlers.set(id, remaining);
    else handlers.delete(id);
  };
}

/** Most recently mounted enabled handler for an action. */
function getHandler(id: ActionId): HotkeyHandler | null {
  const entries = handlers.get(id) ?? [];
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].enabled.current) return entries[i].handler.current;
  }
  return null;
}

/**
 * Runs `handler` when the effective binding of `actionId` is pressed in an active scope.
 * Components never add their own keydown listeners; `HotkeysProvider` owns the only one.
 */
export function useHotkey(
  actionId: ActionId,
  handler: HotkeyHandler,
  { enabled = true }: UseHotkeyOptions = {},
): void {
  const handlerRef = useRef(handler);
  const enabledRef = useRef(enabled);
  useEffect(() => {
    handlerRef.current = handler;
    enabledRef.current = enabled;
  });
  useEffect(
    () => registerHandler(actionId, { handler: handlerRef, enabled: enabledRef }),
    [actionId],
  );
}

// Chords -------------------------------------------------------------------------------------

export const CHORD_TIMEOUT_MS = 800;

interface ChordState {
  /** First step of a chord waiting for its second key, e.g. `"G"`. */
  pending: string | null;
}

/** Subscribe to show the "waiting for the next key" indicator. */
export const useChordStore = create<ChordState>(() => ({ pending: null }));

let chordTimer: ReturnType<typeof setTimeout> | undefined;

function setPendingChord(prefix: string | null) {
  clearTimeout(chordTimer);
  useChordStore.setState({ pending: prefix });
  if (prefix)
    chordTimer = setTimeout(() => useChordStore.setState({ pending: null }), CHORD_TIMEOUT_MS);
}

export function usePendingChord(): string | null {
  return useChordStore((state) => state.pending);
}

// Resolution ---------------------------------------------------------------------------------

export interface HotkeyContext {
  scopes?: Scope[];
  target?: Element | null;
}

export type HotkeyResolution =
  | { type: "action"; actionId: ActionId; scope: Scope }
  | { type: "editor" }
  | { type: "chordStarted"; prefix: string }
  | { type: "none" };

/**
 * Finds what a binding means given the active scopes (most specific first). The first scope
 * that has the binding with a mounted handler consumes it; the editor consumes its own keys and
 * leaves them to Tiptap.
 */
export function resolveBinding(
  binding: string,
  scopes: readonly Scope[],
  { allowChordStart = true } = {},
): HotkeyResolution {
  for (const scope of scopes) {
    const matches = findActionsByBinding(scope, binding);
    if (scope === "editor" && matches.length > 0) return { type: "editor" };
    for (const id of matches) {
      if (getHandler(id)) return { type: "action", actionId: id, scope };
    }
    if (allowChordStart && hasChordWithPrefix(scope, binding)) {
      return { type: "chordStarted", prefix: binding };
    }
  }
  return { type: "none" };
}

/** Processes a keydown. Exported for tests; the app calls it from `HotkeysProvider`. */
export function handleKeyDown(event: KeyboardEvent, context: HotkeyContext = {}): HotkeyResolution {
  if (event.defaultPrevented || event.isComposing) return { type: "none" };
  const stroke = eventToBinding(event);
  if (!stroke) return { type: "none" };

  const target = context.target !== undefined ? context.target : (event.target as Element | null);
  const scopes = context.scopes ?? getActiveScopes(undefined, target);

  const pending = useChordStore.getState().pending;
  if (pending) {
    setPendingChord(null);
    const resolution = resolveBinding(`${pending} ${stroke}`, scopes, { allowChordStart: false });
    if (resolution.type === "action") run(resolution.actionId, event);
    // The second key of an unknown chord is swallowed either way.
    event.preventDefault();
    return resolution;
  }

  // Single keys type text in fields; only Ctrl/Alt combinations (and Escape) pass through.
  if (isEditableTarget(target) && isSimpleStroke(stroke) && stroke !== "Escape") {
    return { type: "none" };
  }

  const resolution = resolveBinding(stroke, scopes);
  if (resolution.type === "action") {
    event.preventDefault();
    run(resolution.actionId, event);
  } else if (resolution.type === "chordStarted") {
    event.preventDefault();
    setPendingChord(resolution.prefix);
  }
  return resolution;
}

function run(id: ActionId, event: KeyboardEvent) {
  getHandler(id)?.(event);
}

/** Clears handlers and chord state. Tests only. */
export function resetHotkeysForTests() {
  handlers.clear();
  setPendingChord(null);
}
