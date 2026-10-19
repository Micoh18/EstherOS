import { create } from "zustand";

// Pre-render cache; providers.tsx syncs it with `setting.sidebar_collapsed`.
const STORAGE_KEY = "estheros.sidebarCollapsed";

function readCollapsed(): boolean {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

interface SidebarState {
  collapsed: boolean;
  toggle: () => void;
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  collapsed: readCollapsed(),
  toggle: () => {
    const collapsed = !get().collapsed;
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // Not persisted; the state still changes for this session.
    }
    set({ collapsed });
  },
}));
