import type { ReactNode } from "react";
import {
  AlarmClock,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  Layers,
  Plus,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useFormattedBinding, type ActionId } from "@/shared/hotkeys";
import { t, type I18nKey } from "@/shared/i18n";
import type { DateISO } from "@/shared/lib/dates";
import { Button, Tooltip, cn } from "@/shared/ui";
import { useOpenCounts } from "../hooks";
import type { TodoList } from "../model";
import { useTodoStore } from "../store";
import type { SmartView } from "../views";
import { ListIcon } from "./ListIcon";
import { PALETTE_TEXT_CLASS } from "./listIcons";

const VIEWS: { view: SmartView; icon: LucideIcon; label: I18nKey; action: ActionId }[] = [
  { view: "today", icon: Sun, label: "todo.view.today", action: "todo.viewToday" },
  {
    view: "upcoming",
    icon: CalendarRange,
    label: "todo.view.upcoming",
    action: "todo.viewUpcoming",
  },
  { view: "overdue", icon: AlarmClock, label: "todo.view.overdue", action: "todo.viewOverdue" },
  { view: "all", icon: Layers, label: "todo.view.all", action: "todo.viewAll" },
];

function NavEntry({
  icon,
  label,
  count,
  active,
  onClick,
  muted,
}: {
  icon: ReactNode;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-[36px] w-full items-center gap-2.5 rounded-md px-3 text-left text-base outline-none",
        "transition-[background-color,color] duration-(--dur-fast) ease-(--ease-soft)",
        "focus-visible:shadow-(--shadow-glow) [&_svg]:size-4 [&_svg]:shrink-0",
        active
          ? "bg-accent-soft font-semibold text-text"
          : "text-text-muted hover:bg-surface-hover hover:text-text",
        muted && !active && "text-text-faint",
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count ? <span className="text-xs font-semibold text-text-faint">{count}</span> : null}
    </button>
  );
}

function ViewEntry({
  view,
  icon: Icon,
  label,
  action,
  count,
}: (typeof VIEWS)[number] & { count: number }) {
  const active = useTodoStore(
    (state) => state.selection.kind === "view" && state.selection.view === view,
  );
  const shortcut = useFormattedBinding(action);
  return (
    <Tooltip content={t(label)} shortcut={shortcut || undefined} side="right">
      <span>
        <NavEntry
          icon={<Icon aria-hidden />}
          label={t(label)}
          count={count}
          active={active}
          onClick={() => useTodoStore.getState().selectView(view)}
        />
      </span>
    </Tooltip>
  );
}

function ListEntry({ list, count }: { list: TodoList; count: number }) {
  const active = useTodoStore(
    (state) => state.selection.kind === "list" && state.selection.listId === list.id,
  );
  return (
    <NavEntry
      icon={
        <ListIcon
          icon={list.icon}
          aria-hidden
          className={list.color ? PALETTE_TEXT_CLASS[list.color] : undefined}
        />
      }
      label={list.name}
      count={count}
      active={active}
      muted={list.isArchived}
      onClick={() => useTodoStore.getState().selectList(list.id)}
    />
  );
}

/** Inner sidebar (240 px): smart views with counters, the lists and the archived ones. */
export function TodoSidebar({ lists, today }: { lists: TodoList[]; today: DateISO }) {
  const counts = useOpenCounts(today);
  const archivedOpen = useTodoStore((state) => state.archivedOpen);
  const newListShortcut = useFormattedBinding("todo.newList");
  const active = lists.filter((list) => !list.isArchived);
  const archived = lists.filter((list) => list.isArchived);
  const viewCounts: Record<SmartView, number> = {
    today: counts.today + counts.overdue,
    upcoming: counts.upcoming,
    overdue: counts.overdue,
    all: counts.all,
  };

  return (
    <nav
      aria-label={t("todo.nav.label")}
      className="flex w-[240px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-border bg-bg-elevated/40 px-3 py-4"
    >
      {VIEWS.map((entry) => (
        <ViewEntry key={entry.view} {...entry} count={viewCounts[entry.view]} />
      ))}

      <div className="mt-5 mb-1 flex items-center justify-between pr-1 pl-3">
        <h2 className="font-display text-sm font-semibold text-text-muted">
          {t("todo.lists.label")}
        </h2>
        <Tooltip content={t("todo.list.newTitle")} shortcut={newListShortcut || undefined}>
          <Button
            variant="ghost"
            size="sm"
            className="px-2"
            onClick={() => useTodoStore.getState().setNewListOpen(true)}
          >
            <Plus aria-hidden />
            {t("todo.lists.new")}
          </Button>
        </Tooltip>
      </div>
      {active.map((list) => (
        <ListEntry key={list.id} list={list} count={counts.byList.get(list.id) ?? 0} />
      ))}

      {archived.length > 0 ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => useTodoStore.getState().toggleArchivedOpen()}
            aria-expanded={archivedOpen}
            className="flex min-h-[32px] w-full items-center gap-1 rounded-md px-3 py-1 text-sm text-text-faint outline-none hover:text-text-muted focus-visible:shadow-(--shadow-glow)"
          >
            {archivedOpen ? (
              <ChevronDown aria-hidden className="size-4" />
            ) : (
              <ChevronRight aria-hidden className="size-4" />
            )}
            {t("todo.lists.archived", { count: archived.length })}
          </button>
          {archivedOpen
            ? archived.map((list) => (
                <ListEntry key={list.id} list={list} count={counts.byList.get(list.id) ?? 0} />
              ))
            : null}
        </div>
      ) : null}
    </nav>
  );
}
