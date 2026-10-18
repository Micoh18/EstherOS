import { useCallback, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router";
import { closeTopmostEscapable, useActiveScopes, useHotkey, type ActionId } from "@/shared/hotkeys";
import { useTheme } from "../theme";
import { NAV_ITEMS, SETTINGS_PATH } from "../navigation";
import { ContentArea } from "./ContentArea";
import { ShortcutsPlaceholder } from "./ShortcutsPlaceholder";
import { Sidebar } from "./Sidebar";
import { TitleBar } from "./TitleBar";
import { useSidebarStore } from "./sidebarStore";

function NavHotkey({ actionId, path }: { actionId: ActionId; path: string }) {
  const navigate = useNavigate();
  useHotkey(actionId, () => navigate(path));
  return null;
}

/** Window frame: title bar, sidebar and routed content, plus the shell's global shortcuts. */
export function AppShell() {
  const navigate = useNavigate();
  const { cycleTheme } = useTheme();
  const toggleSidebar = useSidebarStore((state) => state.toggle);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const dialogOpen = useActiveScopes().includes("dialog");
  const closeShortcuts = useCallback(() => setShortcutsOpen(false), []);

  useHotkey("app.openSettings", () => navigate(SETTINGS_PATH));
  useHotkey("theme.cycle", cycleTheme);
  useHotkey("app.toggleSidebar", toggleSidebar);
  useHotkey("app.showShortcuts", () => setShortcutsOpen((open) => !open));
  // Dialogs (Radix) close themselves on Escape; otherwise close the topmost escapable panel.
  useHotkey("app.escape", () => closeTopmostEscapable(), { enabled: !dialogOpen });

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg text-text">
      {NAV_ITEMS.map((item) => (
        <NavHotkey key={item.actionId} actionId={item.actionId} path={item.path} />
      ))}
      <TitleBar />
      <div className="relative flex min-h-0 flex-1">
        <Sidebar />
        <ContentArea />
        <AnimatePresence>
          {shortcutsOpen && <ShortcutsPlaceholder onClose={closeShortcuts} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
