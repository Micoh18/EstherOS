import { beforeEach, describe, expect, it } from "vitest";
import {
  KEYBINDINGS_STORAGE_KEY,
  findConflicts,
  formatBinding,
  getEffectiveBinding,
  isCustomized,
  replaceOverrides,
  resetAll,
  resetBinding,
  sanitizeOverrides,
  setBinding,
  useKeybindingsStore,
} from "./registry";

beforeEach(() => {
  resetAll();
});

describe("effective bindings", () => {
  it("uses the defaults when nothing is customized", () => {
    expect(getEffectiveBinding("nav.today")).toBe("Ctrl+1");
    expect(getEffectiveBinding("todo.viewToday")).toBe("G T");
  });

  it("applies and persists overrides", () => {
    expect(setBinding("calendar.goToToday", "h")).toEqual({ ok: true });
    expect(getEffectiveBinding("calendar.goToToday")).toBe("H");
    expect(JSON.parse(localStorage.getItem(KEYBINDINGS_STORAGE_KEY) ?? "{}")).toEqual({
      "calendar.goToToday": "H",
    });
  });

  it("allows disabling a shortcut with null", () => {
    setBinding("todo.delete", null);
    expect(getEffectiveBinding("todo.delete")).toBeNull();
    expect(formatBinding("todo.delete")).toBe("");
  });

  it("stores only real changes", () => {
    setBinding("nav.today", "Ctrl+1");
    expect(useKeybindingsStore.getState().overrides).toEqual({});
  });

  it("formats an action's effective binding", () => {
    expect(formatBinding("app.openSettings")).toBe("Ctrl+,");
    setBinding("app.openSettings", "Ctrl+Shift+P");
    expect(formatBinding("app.openSettings")).toBe("Ctrl+Shift+P");
    expect(formatBinding("alt+left")).toBe("Alt+←");
  });
});

describe("setBinding validation", () => {
  it("rejects fixed actions", () => {
    expect(setBinding("app.escape", "Ctrl+Q")).toEqual({ ok: false, reason: "notRemappable" });
  });

  it("rejects reserved combinations", () => {
    expect(setBinding("nav.today", "Ctrl+C")).toEqual({ ok: false, reason: "reserved" });
  });

  it("rejects bindings that do not parse", () => {
    expect(setBinding("nav.today", "Ctrl+")).toEqual({ ok: false, reason: "invalid" });
  });

  it("accepts the action's own default even when it is a bare arrow", () => {
    setBinding("calendar.prev", "Alt+ArrowLeft");
    expect(setBinding("calendar.prev", "ArrowLeft")).toEqual({ ok: true });
    expect(isCustomized("calendar.prev")).toBe(false);
  });
});

describe("inheritance from app.newItem", () => {
  it("follows app.newItem until customized", () => {
    expect(getEffectiveBinding("todo.newTask")).toBe("Ctrl+N");
    setBinding("app.newItem", "Ctrl+Shift+A");
    expect(getEffectiveBinding("todo.newTask")).toBe("Ctrl+Shift+A");
    expect(getEffectiveBinding("journal.newEntry")).toBe("Ctrl+Shift+A");
    expect(getEffectiveBinding("today.newTask")).toBe("Ctrl+Shift+A");
  });

  it("keeps the action's own binding once set", () => {
    setBinding("journal.newEntry", "Ctrl+E");
    setBinding("app.newItem", "Ctrl+Shift+A");
    expect(getEffectiveBinding("journal.newEntry")).toBe("Ctrl+E");
    resetBinding("journal.newEntry");
    expect(getEffectiveBinding("journal.newEntry")).toBe("Ctrl+Shift+A");
  });
});

describe("findConflicts", () => {
  it("detects a clash between global actions", () => {
    expect(findConflicts("nav.today", "Ctrl+2")).toEqual(["nav.calendar"]);
  });

  it("detects a clash between a screen scope and global", () => {
    expect(findConflicts("calendar.goToToday", "Ctrl+B")).toEqual(["app.toggleSidebar"]);
    expect(findConflicts("app.toggleSidebar", "T")).toEqual(["calendar.goToToday"]);
  });

  it("allows repeating a binding across screen scopes", () => {
    expect(findConflicts("today.openJournal", "P")).toEqual([]);
  });

  it("ignores actions that inherit from the action being changed", () => {
    expect(findConflicts("app.newItem", "Ctrl+Shift+A")).toEqual([]);
    expect(findConflicts("todo.newTask", "Ctrl+N")).toEqual([]);
  });

  it("does not report the editor, which shadows global keys by design", () => {
    expect(findConflicts("app.toggleSidebar", "Ctrl+I")).toEqual([]);
  });

  it("detects chord prefixes", () => {
    expect(findConflicts("todo.quickAdd", "G")).toEqual([
      "todo.viewToday",
      "todo.viewUpcoming",
      "todo.viewOverdue",
      "todo.viewAll",
    ]);
  });

  it("detects clashes in shared scopes", () => {
    expect(findConflicts("todo.dueToday", "1")).toEqual(["todo.priorityHigh"]);
  });
});

describe("reset", () => {
  it("resets one action", () => {
    setBinding("nav.today", "Ctrl+Shift+1");
    setBinding("nav.todo", "Ctrl+Shift+4");
    resetBinding("nav.today");
    expect(getEffectiveBinding("nav.today")).toBe("Ctrl+1");
    expect(getEffectiveBinding("nav.todo")).toBe("Ctrl+Shift+4");
  });

  it("resets everything and empties storage", () => {
    setBinding("nav.today", "Ctrl+Shift+1");
    resetAll();
    expect(useKeybindingsStore.getState().overrides).toEqual({});
    expect(localStorage.getItem(KEYBINDINGS_STORAGE_KEY)).toBe("{}");
  });
});

describe("loading stored overrides", () => {
  it("keeps valid entries and drops the rest", () => {
    expect(
      sanitizeOverrides({
        "nav.today": "ctrl+shift+1",
        "todo.delete": null,
        "app.escape": "Ctrl+Q",
        "nope.unknown": "Ctrl+Q",
        "nav.todo": "Ctrl+C",
        "nav.journal": "Ctrl+",
        "nav.settings": 42,
      }),
    ).toEqual({ "nav.today": "Ctrl+Shift+1", "todo.delete": null });
  });

  it("ignores non-object payloads", () => {
    expect(sanitizeOverrides("x")).toEqual({});
    expect(sanitizeOverrides([1])).toEqual({});
  });

  it("replaces the overrides from an external source", () => {
    replaceOverrides({ "theme.cycle": "Ctrl+Alt+T" });
    expect(getEffectiveBinding("theme.cycle")).toBe("Ctrl+Alt+T");
  });
});
