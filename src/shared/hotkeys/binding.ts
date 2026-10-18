import { t } from "@/shared/i18n";
import type { Scope } from "./actions";

/**
 * Bindings are normalized strings: modifiers in the order `Ctrl`, `Alt`, `Shift`, then the key
 * (`Ctrl+Shift+T`, `ArrowLeft`, `Comma`). Chords are steps separated by a space (`G T`).
 */

export interface KeyStroke {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  key: string;
}

export type ParsedBinding = KeyStroke[];

const NAMED_KEYS = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
  "Escape",
  "Enter",
  "Tab",
  "Backspace",
  "Delete",
  "Insert",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "Comma",
  "Period",
  "Slash",
  "Backslash",
  "Minus",
  "Equal",
  "Semicolon",
  "Quote",
  "Backquote",
  "BracketLeft",
  "BracketRight",
  ...Array.from({ length: 12 }, (_, i) => `F${i + 1}`),
];

const NAMED_BY_LOWER = new Map(NAMED_KEYS.map((name) => [name.toLowerCase(), name]));

/** Lower-case aliases accepted by the parser. */
const KEY_ALIASES: Record<string, string> = {
  esc: "Escape",
  del: "Delete",
  supr: "Delete",
  return: "Enter",
  left: "ArrowLeft",
  right: "ArrowRight",
  up: "ArrowUp",
  down: "ArrowDown",
  ",": "Comma",
  ".": "Period",
  "/": "Slash",
  "\\": "Backslash",
  "-": "Minus",
  "=": "Equal",
  ";": "Semicolon",
  "'": "Quote",
  "`": "Backquote",
  "[": "BracketLeft",
  "]": "BracketRight",
};

const MODIFIER_ALIASES: Record<string, keyof Omit<KeyStroke, "key">> = {
  ctrl: "ctrl",
  control: "ctrl",
  alt: "alt",
  option: "alt",
  shift: "shift",
};

function normalizeKeyName(raw: string): string | null {
  const lower = raw.toLowerCase();
  if (/^[a-z0-9]$/.test(lower)) return lower.toUpperCase();
  return NAMED_BY_LOWER.get(lower) ?? KEY_ALIASES[lower] ?? null;
}

function parseStroke(raw: string): KeyStroke | null {
  const parts = raw.split("+").map((part) => part.trim());
  if (parts.some((part) => part === "")) return null;
  const stroke: KeyStroke = { ctrl: false, alt: false, shift: false, key: "" };
  for (const [index, part] of parts.entries()) {
    const modifier = MODIFIER_ALIASES[part.toLowerCase()];
    const isLast = index === parts.length - 1;
    if (modifier && !isLast) {
      if (stroke[modifier]) return null;
      stroke[modifier] = true;
      continue;
    }
    if (!isLast) return null;
    const key = normalizeKeyName(part);
    if (!key) return null;
    stroke.key = key;
  }
  return stroke;
}

/** Parses a binding like `"ctrl+shift+t"` or `"G T"`. Returns null when it is not valid. */
export function parseBinding(input: string): ParsedBinding | null {
  const steps = input.trim().split(/\s+/);
  if (steps.length === 0 || steps[0] === "") return null;
  const parsed: ParsedBinding = [];
  for (const step of steps) {
    const stroke = parseStroke(step);
    if (!stroke) return null;
    parsed.push(stroke);
  }
  return parsed;
}

export function strokeToString(stroke: KeyStroke): string {
  const parts: string[] = [];
  if (stroke.ctrl) parts.push("Ctrl");
  if (stroke.alt) parts.push("Alt");
  if (stroke.shift) parts.push("Shift");
  parts.push(stroke.key);
  return parts.join("+");
}

export function stringifyBinding(binding: ParsedBinding): string {
  return binding.map(strokeToString).join(" ");
}

/** `"shift+ctrl+t"` → `"Ctrl+Shift+T"`. Returns null when the input does not parse. */
export function normalizeBinding(input: string): string | null {
  const parsed = parseBinding(input);
  return parsed ? stringifyBinding(parsed) : null;
}

const DISPLAY_KEYS: Record<string, () => string> = {
  ArrowLeft: () => "←",
  ArrowRight: () => "→",
  ArrowUp: () => "↑",
  ArrowDown: () => "↓",
  Comma: () => ",",
  Period: () => ".",
  Slash: () => "/",
  Backslash: () => "\\",
  Minus: () => "-",
  Equal: () => "=",
  Semicolon: () => ";",
  Quote: () => "'",
  Backquote: () => "`",
  BracketLeft: () => "[",
  BracketRight: () => "]",
  Space: () => t("hotkeys.key.space"),
  Escape: () => t("hotkeys.key.escape"),
  Delete: () => t("hotkeys.key.delete"),
  Backspace: () => t("hotkeys.key.backspace"),
};

/**
 * Human-readable form of a binding string: `Ctrl+Shift+T`, `Alt+←`, `Ctrl+,`, `G luego T`.
 * Returns an empty string for `null` (action without shortcut) or an invalid binding.
 */
export function formatBindingString(binding: string | null): string {
  if (!binding) return "";
  const parsed = parseBinding(binding);
  if (!parsed) return "";
  return parsed
    .map((stroke) => {
      const key = DISPLAY_KEYS[stroke.key]?.() ?? stroke.key;
      return strokeToString({ ...stroke, key });
    })
    .join(t("hotkeys.key.chordSeparator"));
}

const RESERVED_COMBOS = new Set([
  "Alt+F4",
  "Ctrl+C",
  "Ctrl+V",
  "Ctrl+X",
  "Ctrl+Z",
  "Ctrl+Y",
  "Ctrl+A",
  "F11",
]);

const BARE_SYSTEM_KEYS = new Set(["Tab", "Enter", "Escape", "Backspace"]);
const BARE_ROW_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Delete"]);

/**
 * Whether a binding cannot be assigned by the user. Bare arrows and `Delete` are allowed only for
 * actions of the `todo.row` scope. Unparseable bindings count as reserved.
 */
export function isReserved(binding: string, scopes: readonly Scope[] = []): boolean {
  const parsed = parseBinding(binding);
  if (!parsed) return true;
  return parsed.some((stroke) => {
    const normalized = strokeToString(stroke);
    if (RESERVED_COMBOS.has(normalized)) return true;
    const bare = !stroke.ctrl && !stroke.alt && !stroke.shift;
    if (!bare) return false;
    if (BARE_SYSTEM_KEYS.has(stroke.key)) return true;
    return BARE_ROW_KEYS.has(stroke.key) && !scopes.includes("todo.row");
  });
}

const MODIFIER_KEYS = new Set(["Control", "Alt", "Shift", "Meta", "AltGraph", "OS"]);

/** Named keys read from `KeyboardEvent.key`. */
const EVENT_NAMED_KEYS: Record<string, string> = {
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
  ArrowUp: "ArrowUp",
  ArrowDown: "ArrowDown",
  " ": "Space",
  Escape: "Escape",
  Esc: "Escape",
  Enter: "Enter",
  Tab: "Tab",
  Backspace: "Backspace",
  Delete: "Delete",
  Insert: "Insert",
  Home: "Home",
  End: "End",
  PageUp: "PageUp",
  PageDown: "PageDown",
};

/**
 * Punctuation read from the produced character, so `/` matches `Slash` on any keyboard layout
 * (on Spanish layouts it is Shift+7). Shift is dropped for these because the layout requires it.
 */
const EVENT_CHAR_KEYS: Record<string, string> = {
  "/": "Slash",
  ",": "Comma",
  ".": "Period",
};

/** Punctuation physical keys used when the character is not one of the above. */
const EVENT_CODE_KEYS = new Set([
  "Comma",
  "Period",
  "Slash",
  "Backslash",
  "Minus",
  "Equal",
  "Semicolon",
  "Quote",
  "Backquote",
  "BracketLeft",
  "BracketRight",
]);

type KeyEventLike = Pick<
  KeyboardEvent,
  "key" | "code" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey"
>;

/**
 * Normalized single-step binding for a keyboard event, or null for lone modifiers and keys
 * Estheros does not bind. Letters and digits use the physical key (`code`) so `Ctrl+Alt+1` still
 * matches when AltGr produces another character.
 */
export function eventToBinding(event: KeyEventLike): string | null {
  // The Windows key belongs to the system.
  if (MODIFIER_KEYS.has(event.key) || event.metaKey) return null;
  const stroke: KeyStroke = {
    ctrl: event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
    key: "",
  };
  const code = event.code ?? "";

  const letter = /^Key([A-Z])$/.exec(code);
  const digit = /^(?:Digit|Numpad)([0-9])$/.exec(code);
  const fKey = /^F([1-9]|1[0-2])$/.exec(event.key);

  if (letter) {
    stroke.key = letter[1];
  } else if (event.key in EVENT_NAMED_KEYS) {
    stroke.key = EVENT_NAMED_KEYS[event.key];
  } else if (fKey) {
    stroke.key = event.key;
  } else if (event.key in EVENT_CHAR_KEYS) {
    stroke.key = EVENT_CHAR_KEYS[event.key];
    stroke.shift = false;
  } else if (digit) {
    stroke.key = digit[1];
  } else if (EVENT_CODE_KEYS.has(code)) {
    stroke.key = code;
  } else if (/^[a-z]$/i.test(event.key)) {
    stroke.key = event.key.toUpperCase();
  } else {
    return null;
  }
  return strokeToString(stroke);
}

/** True when the binding has no Ctrl or Alt (Shift alone still types text). */
export function isSimpleStroke(binding: string): boolean {
  const parsed = parseBinding(binding);
  return !!parsed && parsed.every((stroke) => !stroke.ctrl && !stroke.alt);
}
