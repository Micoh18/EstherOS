import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { HotkeysProvider } from "@/shared/hotkeys";
import {
  ThemeContext,
  getDarkQuery,
  nextTheme,
  readStoredTheme,
  resolveTheme,
  storeTheme,
  type ResolvedTheme,
  type Theme,
} from "./theme";
import "./layout/_tmp/tmp-tokens.css";
import "./theme-transition.css";

const FADE_CLASS = "theme-transition";
const FADE_MS = 260;

let fadeTimer: ReturnType<typeof setTimeout> | undefined;

function applyTheme(resolved: ResolvedTheme, fade: boolean) {
  const root = document.documentElement;
  if (root.dataset.theme === resolved) return;
  if (fade) {
    root.classList.add(FADE_CLASS);
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(() => root.classList.remove(FADE_CLASS), FADE_MS);
  }
  root.dataset.theme = resolved;
}

function usePrefersDark(): boolean {
  const [prefersDark, setPrefersDark] = useState(() => getDarkQuery()?.matches ?? false);
  useEffect(() => {
    const query = getDarkQuery();
    if (!query) return;
    const onChange = () => setPrefersDark(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return prefersDark;
}

/**
 * Applies `data-theme` on <html>. The first value is already set by the inline script in
 * index.html (no flash); later changes fade colors for --dur-base.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  const prefersDark = usePrefersDark();
  const resolvedTheme = resolveTheme(theme, prefersDark);

  const isFirstApply = useRef(true);
  useEffect(() => {
    applyTheme(resolvedTheme, !isFirstApply.current);
    isFirstApply.current = false;
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    storeTheme(next);
    setThemeState(next);
  }, []);

  const cycleTheme = useCallback(() => {
    setTheme(nextTheme(theme, resolvedTheme));
  }, [setTheme, theme, resolvedTheme]);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, cycleTheme }),
    [theme, resolvedTheme, setTheme, cycleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <HotkeysProvider>{children}</HotkeysProvider>
    </ThemeProvider>
  );
}
