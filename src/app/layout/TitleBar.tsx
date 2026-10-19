import { Heart, Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { formatBinding, useFormattedBinding, usePendingChord } from "@/shared/hotkeys";
import { t } from "@/shared/i18n";
import { Bow } from "@/shared/icons";
import { IconButton, Tooltip } from "@/shared/ui";
import { useTheme, type ResolvedTheme } from "@/shared/theme";
import { WindowControls } from "./WindowControls";

const THEME_ICONS: Record<ResolvedTheme, typeof Heart> = { pink: Heart, white: Sun, dark: Moon };

function ChordIndicator() {
  const pending = usePendingChord();
  return (
    <AnimatePresence>
      {pending && (
        <motion.span
          role="status"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.14 }}
          className="mr-2 rounded-(--radius-pill) bg-accent-soft px-2.5 py-0.5 font-mono text-xs text-text"
        >
          {t("shell.titleBar.chordPending", { keys: formatBinding(pending) })}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/**
 * Custom 40 px title bar. Dragging and double-click to maximize come from Tauri's
 * `data-tauri-drag-region`, which only reacts on the element that carries the attribute.
 */
export function TitleBar() {
  const { theme, resolvedTheme, cycleTheme } = useTheme();
  const cycleBinding = useFormattedBinding("theme.cycle");
  const ThemeIcon = THEME_ICONS[resolvedTheme];
  const themeLabel = t("shell.titleBar.cycleTheme", { theme: t(`theme.${theme}` as const) });

  return (
    <header
      data-tauri-drag-region
      className="flex h-10 shrink-0 select-none items-center border-b border-border bg-bg-elevated"
    >
      <div data-tauri-drag-region className="flex h-full items-center gap-1.5 pl-4">
        <span data-tauri-drag-region className="font-display text-base font-semibold text-text">
          {t("app.name")}
        </span>
        <Bow data-tauri-drag-region size={16} className="text-accent" />
      </div>
      <div data-tauri-drag-region className="h-full flex-1" />
      <ChordIndicator />
      <Tooltip content={themeLabel} shortcut={cycleBinding || undefined}>
        <IconButton label={themeLabel} size="sm" onClick={cycleTheme} className="mr-2">
          <ThemeIcon strokeWidth={1.75} />
        </IconButton>
      </Tooltip>
      <WindowControls />
    </header>
  );
}
