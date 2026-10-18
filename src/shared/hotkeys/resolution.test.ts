import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionId } from "./actions";
import { resetAll, setBinding } from "./registry";
import { getActiveScopes, pushScope, useScopeStore } from "./scope";
import {
  CHORD_TIMEOUT_MS,
  handleKeyDown,
  registerHandler,
  resetHotkeysForTests,
  useChordStore,
} from "./useHotkey";

function press(
  key: string,
  code: string,
  mods: Partial<KeyboardEventInit> = {},
  target: Element | null = document.body,
) {
  const event = new KeyboardEvent("keydown", { key, code, cancelable: true, ...mods });
  const resolution = handleKeyDown(event, { target });
  return { event, resolution };
}

function on(id: ActionId) {
  const handler = vi.fn();
  registerHandler(id, { handler: { current: handler }, enabled: { current: true } });
  return handler;
}

beforeEach(() => {
  resetAll();
  resetHotkeysForTests();
  useScopeStore.setState({ stack: [] });
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("getActiveScopes", () => {
  it("orders by specificity, not by push order", () => {
    pushScope("todo.row");
    pushScope("todo");
    expect(getActiveScopes(undefined, null)).toEqual(["todo.row", "todo", "global"]);
  });

  it("hides screen scopes while a dialog is open", () => {
    pushScope("calendar");
    pushScope("dialog");
    expect(getActiveScopes(undefined, null)).toEqual(["dialog", "global"]);
  });

  it("puts the editor first when it has the focus", () => {
    document.body.innerHTML =
      '<div class="ProseMirror" contenteditable="true"><p id="p"></p></div>';
    pushScope("journal");
    expect(getActiveScopes(undefined, document.getElementById("p"))).toEqual([
      "editor",
      "journal",
      "global",
    ]);
  });

  it("pops exactly the entry that was pushed", () => {
    const popTodo = pushScope("todo");
    pushScope("todo");
    popTodo();
    expect(useScopeStore.getState().stack).toHaveLength(1);
  });
});

describe("handleKeyDown", () => {
  it("runs global actions", () => {
    const navToday = on("nav.today");
    const { event } = press("1", "Digit1", { ctrlKey: true });
    expect(navToday).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it("only runs screen actions while their scope is active", () => {
    const goToToday = on("calendar.goToToday");
    press("t", "KeyT");
    expect(goToToday).not.toHaveBeenCalled();
    const pop = pushScope("calendar");
    press("t", "KeyT");
    expect(goToToday).toHaveBeenCalledOnce();
    pop();
  });

  it("lets the most specific scope win for a shared binding", () => {
    const newItem = on("app.newItem");
    const newTask = on("todo.newTask");
    pushScope("todo");
    press("n", "KeyN", { ctrlKey: true });
    expect(newTask).toHaveBeenCalledOnce();
    expect(newItem).not.toHaveBeenCalled();
  });

  it("falls back to global when the specific scope has no handler", () => {
    const newItem = on("app.newItem");
    pushScope("journal");
    press("n", "KeyN", { ctrlKey: true });
    expect(newItem).toHaveBeenCalledOnce();
  });

  it("ignores single keys in text fields but not Ctrl combinations", () => {
    document.body.innerHTML = '<input id="i" type="text" />';
    const input = document.getElementById("i");
    const goToToday = on("calendar.goToToday");
    const navToday = on("nav.today");
    pushScope("calendar");
    press("t", "KeyT", {}, input);
    expect(goToToday).not.toHaveBeenCalled();
    press("1", "Digit1", { ctrlKey: true }, input);
    expect(navToday).toHaveBeenCalledOnce();
  });

  it("lets the editor keep Ctrl+B instead of toggling the sidebar", () => {
    document.body.innerHTML =
      '<div class="ProseMirror" contenteditable="true"><p id="p"></p></div>';
    const toggleSidebar = on("app.toggleSidebar");
    const { event, resolution } = press(
      "b",
      "KeyB",
      { ctrlKey: true },
      document.getElementById("p"),
    );
    expect(resolution).toEqual({ type: "editor" });
    expect(toggleSidebar).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("dialogs block screen shortcuts", () => {
    const goToToday = on("calendar.goToToday");
    pushScope("calendar");
    pushScope("dialog");
    press("t", "KeyT");
    expect(goToToday).not.toHaveBeenCalled();
  });

  it("uses the user's overrides", () => {
    const goToToday = on("calendar.goToToday");
    pushScope("calendar");
    setBinding("calendar.goToToday", "H");
    press("t", "KeyT");
    expect(goToToday).not.toHaveBeenCalled();
    press("h", "KeyH");
    expect(goToToday).toHaveBeenCalledOnce();
  });

  it("skips disabled handlers", () => {
    const handler = vi.fn();
    registerHandler("nav.today", { handler: { current: handler }, enabled: { current: false } });
    press("1", "Digit1", { ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("chords", () => {
  it("waits for the second key and runs the chord", () => {
    const viewOverdue = on("todo.viewOverdue");
    pushScope("todo");
    expect(press("g", "KeyG").resolution).toEqual({ type: "chordStarted", prefix: "G" });
    expect(useChordStore.getState().pending).toBe("G");
    press("o", "KeyO");
    expect(viewOverdue).toHaveBeenCalledOnce();
    expect(useChordStore.getState().pending).toBeNull();
  });

  it("expires after the timeout", () => {
    vi.useFakeTimers();
    const viewAll = on("todo.viewAll");
    pushScope("todo");
    press("g", "KeyG");
    vi.advanceTimersByTime(CHORD_TIMEOUT_MS + 1);
    expect(useChordStore.getState().pending).toBeNull();
    press("a", "KeyA");
    expect(viewAll).not.toHaveBeenCalled();
  });

  it("does not start chords outside their scope", () => {
    expect(press("g", "KeyG").resolution).toEqual({ type: "none" });
  });
});
