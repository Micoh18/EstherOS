import { describe, expect, it } from "vitest";
import {
  eventToBinding,
  formatBindingString,
  isReserved,
  normalizeBinding,
  parseBinding,
} from "./binding";

const key = (init: Partial<KeyboardEventInit> & { key: string; code?: string }) =>
  new KeyboardEvent("keydown", init);

describe("parseBinding", () => {
  it("parses modifiers and key", () => {
    expect(parseBinding("Ctrl+Shift+T")).toEqual([
      { ctrl: true, alt: false, shift: true, key: "T" },
    ]);
  });

  it("parses chords as several steps", () => {
    expect(parseBinding("G T")).toHaveLength(2);
  });

  it.each(["", "Ctrl+", "Ctrl+Ctrl+A", "Foo", "A+Ctrl", "Ctrl++"])("rejects %j", (input) => {
    expect(parseBinding(input)).toBeNull();
  });
});

describe("normalizeBinding", () => {
  it.each([
    ["ctrl+shift+t", "Ctrl+Shift+T"],
    ["shift+ctrl+t", "Ctrl+Shift+T"],
    ["alt+ctrl+1", "Ctrl+Alt+1"],
    ["control+,", "Ctrl+Comma"],
    ["ctrl+/", "Ctrl+Slash"],
    ["esc", "Escape"],
    ["alt+left", "Alt+ArrowLeft"],
    ["space", "Space"],
    ["f11", "F11"],
    ["g  t", "G T"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeBinding(input)).toBe(expected);
  });

  it("returns null for invalid input", () => {
    expect(normalizeBinding("Ctrl+Hyper")).toBeNull();
  });
});

describe("formatBindingString", () => {
  it.each([
    ["Ctrl+Shift+T", "Ctrl+Shift+T"],
    ["ArrowLeft", "←"],
    ["Alt+ArrowRight", "Alt+→"],
    ["ArrowUp", "↑"],
    ["ArrowDown", "↓"],
    ["Ctrl+Comma", "Ctrl+,"],
    ["Ctrl+Slash", "Ctrl+/"],
    ["Slash", "/"],
    ["Space", "Espacio"],
    ["G T", "G luego T"],
  ])("%s → %s", (input, expected) => {
    expect(formatBindingString(input)).toBe(expected);
  });

  it("returns an empty string for no shortcut", () => {
    expect(formatBindingString(null)).toBe("");
  });
});

describe("isReserved", () => {
  it.each(["Alt+F4", "Ctrl+C", "Ctrl+V", "Ctrl+X", "Ctrl+Z", "Ctrl+Y", "Ctrl+A", "F11"])(
    "%s is reserved",
    (binding) => expect(isReserved(binding)).toBe(true),
  );

  it.each(["Tab", "Enter", "Escape", "Backspace"])("bare %s is reserved everywhere", (binding) => {
    expect(isReserved(binding, ["todo.row"])).toBe(true);
  });

  it("allows bare arrows and Delete only in todo.row", () => {
    expect(isReserved("ArrowLeft", ["calendar"])).toBe(true);
    expect(isReserved("Delete", ["todo"])).toBe(true);
    expect(isReserved("Delete", ["todo.row"])).toBe(false);
    expect(isReserved("ArrowUp", ["todo.row"])).toBe(false);
  });

  it("allows normal combinations and modified system keys", () => {
    expect(isReserved("Ctrl+Shift+T")).toBe(false);
    expect(isReserved("H")).toBe(false);
    expect(isReserved("Alt+ArrowLeft")).toBe(false);
    expect(isReserved("Ctrl+Enter")).toBe(false);
  });

  it("checks every step of a chord", () => {
    expect(isReserved("G Escape")).toBe(true);
  });
});

describe("eventToBinding", () => {
  it("builds the binding from modifiers and the physical letter", () => {
    expect(eventToBinding(key({ key: "T", code: "KeyT", ctrlKey: true, shiftKey: true }))).toBe(
      "Ctrl+Shift+T",
    );
  });

  it("ignores lone modifiers and the Windows key", () => {
    expect(eventToBinding(key({ key: "Control", code: "ControlLeft", ctrlKey: true }))).toBeNull();
    expect(eventToBinding(key({ key: "d", code: "KeyD", metaKey: true }))).toBeNull();
  });

  it("uses the physical digit when AltGr produces another character", () => {
    expect(eventToBinding(key({ key: "|", code: "Digit1", ctrlKey: true, altKey: true }))).toBe(
      "Ctrl+Alt+1",
    );
    expect(eventToBinding(key({ key: "=", code: "Digit0", shiftKey: true }))).toBe("Shift+0");
  });

  it("falls back to the character when the event has no physical code", () => {
    expect(eventToBinding(key({ key: "2", code: "", ctrlKey: true }))).toBe("Ctrl+2");
    expect(eventToBinding(key({ key: "b", code: "", ctrlKey: true }))).toBe("Ctrl+B");
  });

  it("reads slash from the character on layouts where it needs Shift", () => {
    expect(eventToBinding(key({ key: "/", code: "Digit7", shiftKey: true }))).toBe("Slash");
    expect(eventToBinding(key({ key: "/", code: "Digit7", ctrlKey: true, shiftKey: true }))).toBe(
      "Ctrl+Slash",
    );
  });

  it("maps named keys", () => {
    expect(eventToBinding(key({ key: " ", code: "Space" }))).toBe("Space");
    expect(eventToBinding(key({ key: "ArrowLeft", code: "ArrowLeft", altKey: true }))).toBe(
      "Alt+ArrowLeft",
    );
    expect(eventToBinding(key({ key: ",", code: "Comma", ctrlKey: true }))).toBe("Ctrl+Comma");
    expect(eventToBinding(key({ key: "Escape", code: "Escape" }))).toBe("Escape");
  });
});
