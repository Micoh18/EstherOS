import { useEffect } from "react";
import { create } from "zustand";
import type { Scope } from "./actions";

interface ScopeEntry {
  token: number;
  scope: Scope;
}

interface ScopeState {
  stack: ScopeEntry[];
}

export const useScopeStore = create<ScopeState>(() => ({ stack: [] }));

let nextToken = 1;

/** Pushes a scope and returns the function that removes exactly that entry. */
export function pushScope(scope: Scope): () => void {
  const token = nextToken++;
  useScopeStore.setState((state) => ({ stack: [...state.stack, { token, scope }] }));
  return () =>
    useScopeStore.setState((state) => ({
      stack: state.stack.filter((entry) => entry.token !== token),
    }));
}

/** Activates `scope` while the component is mounted (and `enabled` is true). */
export function useScope(scope: Scope, enabled = true): void {
  useEffect(() => (enabled ? pushScope(scope) : undefined), [scope, enabled]);
}

/**
 * Specificity of each scope. Child effects run before their parents' in React, so the push order
 * alone cannot tell `todo.row` is more specific than `todo`.
 */
const SPECIFICITY: Record<Scope, number> = {
  global: 0,
  today: 1,
  calendar: 1,
  journal: 1,
  todo: 1,
  "todo.row": 2,
  "todo.detail": 2,
  editor: 3,
  dialog: 4,
};

const EDITOR_SELECTOR = '.ProseMirror, [data-hotkey-scope="editor"]';

/** True when the element is inside the rich text editor. */
export function isEditorTarget(el: Element | null): boolean {
  return !!el?.closest?.(EDITOR_SELECTOR);
}

const NON_TEXT_INPUTS = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

/** True for inputs, textareas, selects, contenteditable elements and the editor. */
export function isEditableTarget(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(el.type);
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  if (el instanceof HTMLElement && el.isContentEditable) return true;
  return isEditorTarget(el);
}

/**
 * Scopes in resolution order, most specific first, always ending in `global`. An open dialog
 * hides the screen scopes beneath it. The editor scope comes from the focused element.
 */
export function getActiveScopes(
  stack: readonly ScopeEntry[] = useScopeStore.getState().stack,
  focused: Element | null = typeof document === "undefined" ? null : document.activeElement,
): Scope[] {
  const hasDialog = stack.some((entry) => entry.scope === "dialog");
  const ordered = stack
    .filter((entry) => !hasDialog || entry.scope === "dialog")
    .sort((a, b) => SPECIFICITY[b.scope] - SPECIFICITY[a.scope] || b.token - a.token)
    .map((entry) => entry.scope);
  // The focused editor claims its keys first, even inside a dialog.
  if (isEditorTarget(focused)) ordered.unshift("editor");
  const unique = [...new Set(ordered)].filter((scope) => scope !== "global");
  return [...unique, "global"];
}

/** Reactive list of active scopes (without the editor, which depends on focus). */
export function useActiveScopes(): Scope[] {
  const stack = useScopeStore((state) => state.stack);
  return getActiveScopes(stack, null);
}
