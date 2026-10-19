import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Keyboard, RotateCcw, Search } from "lucide-react";
import {
  KeyRecorder,
  ShortcutsSheet,
  formatBindingString,
  getAction,
  getEffectiveBinding,
  isActionId,
  listActions,
  normalizeBinding,
  resetAll,
  resetBinding,
  useKeybindingsStore,
  type ActionDef,
  type ActionId,
  type KeybindingOverrides,
  type Scope,
} from "@/shared/hotkeys";
import { t } from "@/shared/i18n";
import { Button, IconButton, Input, Kbd, Tooltip, cn } from "@/shared/ui";

type Group = "global" | "today" | "calendar" | "journal" | "editor" | "todo";

const GROUPS: readonly Group[] = ["global", "today", "calendar", "journal", "editor", "todo"];

const GROUP_OF: Record<Scope, Group> = {
  global: "global",
  today: "today",
  calendar: "calendar",
  journal: "journal",
  editor: "editor",
  todo: "todo",
  "todo.row": "todo",
  "todo.detail": "todo",
  dialog: "global",
};

type Status = "default" | "custom" | "disabled" | "inherits";

function statusOf(action: ActionDef, overrides: KeybindingOverrides): Status {
  const id = action.id as ActionId;
  if (Object.hasOwn(overrides, id)) return overrides[id] === null ? "disabled" : "custom";
  return action.inheritsFrom ? "inherits" : "default";
}

/** Lower case without accents, for the search box. */
const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Matches the action name, the shown combination, or an exact normalized combination. */
function matches(action: ActionDef, binding: string | null, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  if (fold(t(action.labelKey)).includes(fold(q))) return true;
  if (!binding) return false;
  const exact = normalizeBinding(q);
  if (exact && exact === binding) return true;
  return (
    fold(binding).includes(fold(q.replace(/\s+/g, ""))) ||
    fold(formatBindingString(binding)).includes(fold(q))
  );
}

function StatusBadge({ action, status }: { action: ActionDef; status: Status }) {
  if (status === "inherits" && action.inheritsFrom && isActionId(action.inheritsFrom)) {
    return (
      <span className="text-xs text-text-muted">
        {t("settings.shortcuts.status.inherits", {
          name: t(getAction(action.inheritsFrom).labelKey),
        })}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center rounded-full px-2 text-xs font-semibold",
        status === "custom" && "bg-accent-soft text-text",
        status === "disabled" && "bg-bg-elevated text-text-faint line-through",
        status === "default" && "text-text-muted",
      )}
    >
      {t(`settings.shortcuts.status.${status === "inherits" ? "default" : status}`)}
    </span>
  );
}

function ShortcutRow({
  action,
  overrides,
  recording,
  onRecord,
  onDone,
}: {
  action: ActionDef;
  overrides: KeybindingOverrides;
  recording: boolean;
  onRecord: () => void;
  onDone: () => void;
}) {
  const id = action.id as ActionId;
  const name = t(action.labelKey);
  const binding = getEffectiveBinding(id, overrides);
  const status = statusOf(action, overrides);
  const combo = formatBindingString(binding);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasRecording = useRef(recording);

  // The recorder unmounts when it finishes; if that left focus on <body> (Enter, Escape…),
  // give it back to the pill. A blur to another element keeps that element focused.
  useEffect(() => {
    const finished = wasRecording.current && !recording;
    wasRecording.current = recording;
    if (finished && (!document.activeElement || document.activeElement === document.body)) {
      triggerRef.current?.focus();
    }
  }, [recording]);

  const pill = combo ? (
    <Kbd combo={combo} size="sm" />
  ) : (
    <span className="text-xs text-text-faint">{t("settings.shortcuts.none")}</span>
  );

  if (!action.remappable) {
    const reason = action.scopes.includes("editor")
      ? t("settings.shortcuts.fixed.editor")
      : t("settings.shortcuts.fixed.system");
    return (
      <tr className="border-b border-border opacity-55 last:border-b-0" data-action-id={id}>
        <td className="py-2 pr-3">
          <Tooltip content={reason} side="right">
            <span
              tabIndex={0}
              className="cursor-help rounded-sm outline-none focus-visible:shadow-(--shadow-glow)"
            >
              {name}
            </span>
          </Tooltip>
        </td>
        <td className="py-2 pr-3">{pill}</td>
        <td className="py-2 pr-3" />
        <td className="py-2" />
      </tr>
    );
  }

  return (
    <tr className="border-b border-border align-top last:border-b-0" data-action-id={id}>
      <td className="py-2 pr-3 leading-[32px]">{name}</td>
      <td className="py-2 pr-3">
        {recording ? (
          <KeyRecorder actionId={id} onDone={onDone} />
        ) : (
          <button
            ref={triggerRef}
            type="button"
            onClick={onRecord}
            aria-label={t("settings.shortcuts.edit", { name })}
            className="inline-flex min-h-[32px] items-center rounded-full px-2 outline-none hover:bg-surface-hover focus-visible:shadow-(--shadow-glow)"
          >
            {pill}
          </button>
        )}
      </td>
      <td className="py-2 pr-3 leading-[32px]">
        <StatusBadge action={action} status={status} />
      </td>
      <td className="py-2 text-right">
        {status === "custom" || status === "disabled" ? (
          <IconButton
            size="sm"
            label={t("settings.shortcuts.reset", { name })}
            onClick={() => resetBinding(id)}
          >
            <RotateCcw aria-hidden />
          </IconButton>
        ) : null}
      </td>
    </tr>
  );
}

function ResetAll({ disabled }: { disabled: boolean }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <Button variant="ghost" disabled={disabled} onClick={() => setConfirming(true)}>
        <RotateCcw aria-hidden />
        {t("settings.shortcuts.resetAll")}
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md bg-bg-elevated px-3 py-2 text-sm">
      <span>{t("settings.shortcuts.resetAllConfirm")}</span>
      <Button
        size="sm"
        onClick={() => {
          resetAll();
          setConfirming(false);
        }}
      >
        {t("settings.shortcuts.resetAllYes")}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
        {t("settings.common.cancel")}
      </Button>
    </div>
  );
}

/** Settings → Atajos: every action by scope, with search, inline recorder and reset. */
export function ShortcutsSection() {
  const overrides = useKeybindingsStore((state) => state.overrides);
  const [query, setQuery] = useState("");
  const [recording, setRecording] = useState<ActionId | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const groups = useMemo(
    () =>
      GROUPS.map((group) => ({
        group,
        actions: listActions().filter(
          (action) =>
            GROUP_OF[action.scopes[0]] === group &&
            matches(action, getEffectiveBinding(action.id as ActionId, overrides), query),
        ),
      })).filter((entry) => entry.actions.length > 0),
    [overrides, query],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-faint"
            aria-hidden
          />
          <Input
            type="search"
            aria-label={t("settings.shortcuts.search")}
            placeholder={t("settings.shortcuts.search")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="ghost" onClick={() => setSheetOpen(true)}>
          <Keyboard aria-hidden />
          {t("settings.shortcuts.openSheet")}
        </Button>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-text-muted">{t("settings.shortcuts.noResults", { query })}</p>
      ) : (
        groups.map(({ group, actions }) => (
          <section key={group} aria-label={t(`hotkeys.scope.${group}`)}>
            <h3 className="mb-2 font-display text-lg font-semibold">
              {t(`hotkeys.scope.${group}`)}
            </h3>
            <div className="overflow-x-auto rounded-lg border border-border bg-surface px-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-text-muted">
                    <th className="w-[38%] py-2 pr-3 font-semibold">
                      {t("settings.shortcuts.col.action")}
                    </th>
                    <th className="w-[32%] py-2 pr-3 font-semibold">
                      {t("settings.shortcuts.col.binding")}
                    </th>
                    <th className="py-2 pr-3 font-semibold">
                      {t("settings.shortcuts.col.status")}
                    </th>
                    <th className="w-[48px] py-2">
                      <span className="sr-only">{t("settings.shortcuts.col.actions")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {actions.map((action) => (
                    <ShortcutRow
                      key={action.id}
                      action={action}
                      overrides={overrides}
                      recording={recording === action.id}
                      onRecord={() => setRecording(action.id as ActionId)}
                      onDone={() => setRecording(null)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}

      <div className="flex justify-end">
        <ResetAll disabled={Object.keys(overrides).length === 0} />
      </div>

      <AnimatePresence>
        {sheetOpen ? <ShortcutsSheet onClose={() => setSheetOpen(false)} /> : null}
      </AnimatePresence>
    </div>
  );
}
