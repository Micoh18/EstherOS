import { create } from "zustand";

// TODO(A8): persist in the settings table instead of localStorage.
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
