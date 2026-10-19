import { createContext, useContext } from "react";

import { DEFAULT_THEME, THEMES, type ThemeName } from "./constants";

/** A theme that can be painted (`data-theme`). */
export type ResolvedTheme = ThemeName;
/** What the user picks: a theme, or follow Windows. */
export type Theme = ResolvedTheme | "system";

// Cache of `setting.theme` (synced in app/providers.tsx) so the first render needs no database.
// The inline script in index.html reads the same key to set data-theme before the first paint.
export const THEME_STORAGE_KEY = "estheros.theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

export function isTheme(value: unknown): value is Theme {
  return value === "system" || THEMES.includes(value as ResolvedTheme);
}

export function readStoredTheme(): Theme {
  try {
    const stored = globalThis.localStorage?.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function storeTheme(theme: Theme) {
  try {
    globalThis.localStorage?.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage unavailable: the theme still applies for this session.
  }
}

export function getDarkQuery(): MediaQueryList | null {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(DARK_QUERY)
    : null;
}

/** `system` follows Windows: dark → Dark, light → White (never Pink). */
export function resolveTheme(theme: Theme, prefersDark = getDarkQuery()?.matches ?? false) {
  if (theme !== "system") return theme;
  return prefersDark ? "dark" : "white";
}

/** Next theme for `theme.cycle`. From `system` it continues after the resolved theme. */
export function nextTheme(theme: Theme, resolved: ResolvedTheme): ResolvedTheme {
  const current = theme === "system" ? resolved : theme;
  return THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
}

export interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}
