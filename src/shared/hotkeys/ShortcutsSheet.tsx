import { useRef } from "react";
import { motion } from "framer-motion";
import { Keyboard, X } from "lucide-react";
import { IconButton, Kbd } from "@/shared/ui";
import { t } from "@/shared/i18n";
import { listActions, type ActionId, type Scope } from "./actions";
import { formatBindingString } from "./binding";
import { useEscapeClose } from "./escape";
import { getEffectiveBinding, useKeybindingsStore } from "./registry";
import { useActiveScopes } from "./scope";

export interface ShortcutsSheetProps {
  onClose: () => void;
  /** Scopes to list, most specific first. Defaults to the active ones (always ending in global). */
  scopes?: Scope[];
}

/** Sub-scopes are listed together with their screen. */
const SHEET_GROUP: Partial<Record<Scope, Scope>> = { "todo.row": "todo", "todo.detail": "todo" };

/**
 * Overlay for `app.showShortcuts` (Ctrl+/): the shortcuts of the active screen plus the global
 * ones, with the effective bindings (user changes included). Closes with Escape.
 */
export function ShortcutsSheet({ onClose, scopes }: ShortcutsSheetProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEscapeClose(ref, onClose);
  const overrides = useKeybindingsStore((state) => state.overrides);
  const activeScopes = useActiveScopes();
  const shown = (scopes ?? activeScopes).filter((scope) => scope !== "dialog");

  const groups = [...new Set(shown.map((scope) => SHEET_GROUP[scope] ?? scope))]
    .map((group) => ({
      group,
      rows: listActions()
        .filter((action) => action.scopes.some((scope) => (SHEET_GROUP[scope] ?? scope) === group))
        .map((action) => ({
          id: action.id as ActionId,
          label: t(action.labelKey),
          combo: formatBindingString(getEffectiveBinding(action.id as ActionId, overrides)),
        }))
        .filter((row) => row.combo !== ""),
    }))
    .filter((entry) => entry.rows.length > 0);

  return (
    <motion.div
      ref={ref}
      data-escape-close
      role="dialog"
      aria-modal="false"
      aria-labelledby="shortcuts-sheet-title"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.33, 0.9, 0.35, 1] }}
      className="absolute right-6 bottom-6 z-50 flex max-h-[calc(100%-48px)] w-[380px] flex-col rounded-lg border border-border bg-surface text-text shadow-(--shadow-lg)"
    >
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 pt-4 pb-3">
        <div>
          <h2 id="shortcuts-sheet-title" className="flex items-center gap-2 font-display text-lg">
            <Keyboard size={18} strokeWidth={1.75} className="text-accent" aria-hidden />
            {t("shell.shortcuts.title")}
          </h2>
          <p className="text-xs text-text-muted">{t("settings.shortcutsSheet.hint")}</p>
        </div>
        <IconButton label={t("settings.shortcutsSheet.close")} size="sm" onClick={onClose}>
          <X aria-hidden />
        </IconButton>
      </header>
      <div className="min-h-0 overflow-y-auto px-5 py-3">
        {groups.length === 0 ? (
          <p className="text-sm text-text-muted">{t("settings.shortcutsSheet.empty")}</p>
        ) : (
          groups.map(({ group, rows }) => (
            <section
              key={group}
              className="mb-4 last:mb-0"
              aria-label={t(`hotkeys.scope.${group}`)}
            >
              <h3 className="mb-1 text-xs font-semibold tracking-wide text-text-muted uppercase">
                {t(`hotkeys.scope.${group}`)}
              </h3>
              <ul>
                {rows.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-3 py-1 text-sm"
                    data-action-id={row.id}
                  >
                    <span>{row.label}</span>
                    <Kbd combo={row.combo} size="sm" />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </motion.div>
  );
}
