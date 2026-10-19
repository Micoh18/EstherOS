import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { OnboardingGate } from "@/features/onboarding";
import { AppearanceProvider, bindSetting, saveSetting, watchSetting } from "@/features/settings";
import { HotkeysProvider, replaceOverrides, useKeybindingsStore } from "@/shared/hotkeys";
import { ToastProvider } from "@/shared/ui";
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
import { useSidebarStore } from "./layout/sidebarStore";
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

  // localStorage gave the first value; the settings table is the source of truth and wins.
  useEffect(
    () =>
      watchSetting("theme", (stored) => {
        storeTheme(stored);
        setThemeState(stored);
      }),
    [],
  );

  const isFirstApply = useRef(true);
  useEffect(() => {
    applyTheme(resolvedTheme, !isFirstApply.current);
    isFirstApply.current = false;
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    storeTheme(next);
    setThemeState(next);
    void saveSetting("theme", next);
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

/**
 * Sidebar and keybindings live in their stores (with a localStorage copy for the first render);
 * these bindings load them from the settings table and save every change back.
 */
function useStoreSettings() {
  useEffect(() => {
    const offSidebar = bindSetting("sidebar_collapsed", {
      read: () => useSidebarStore.getState().collapsed,
      apply: (collapsed) => {
        if (useSidebarStore.getState().collapsed !== collapsed) useSidebarStore.getState().toggle();
      },
      subscribe: (onChange) =>
        useSidebarStore.subscribe((state, prev) => {
          if (state.collapsed !== prev.collapsed) onChange(state.collapsed);
        }),
    });
    const offKeybindings = bindSetting("keybindings", {
      read: () => useKeybindingsStore.getState().overrides,
      apply: replaceOverrides,
      subscribe: (onChange) =>
        useKeybindingsStore.subscribe((state, prev) => {
          if (state.overrides !== prev.overrides)
            onChange(state.overrides as Record<string, string | null>);
        }),
    });
    return () => {
      offSidebar();
      offKeybindings();
    };
  }, []);
}

export function AppProviders({ children }: { children: ReactNode }) {
  useStoreSettings();
  return (
    <ThemeProvider>
      <AppearanceProvider>
        <HotkeysProvider>
          <ToastProvider>
            {children}
            <OnboardingGate />
          </ToastProvider>
        </HotkeysProvider>
      </AppearanceProvider>
    </ThemeProvider>
  );
}
