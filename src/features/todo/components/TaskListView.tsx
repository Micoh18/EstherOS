import { useMemo, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { useHotkey } from "@/shared/hotkeys";
import { t } from "@/shared/i18n";
import type { DateISO } from "@/shared/lib/dates";
import { Sparkle, StarSmall, Cloud } from "@/shared/icons";
import { Button, EmptyState } from "@/shared/ui";
import { confirmDeleteTask, toggleTaskDone, useSelectionTasks, useTaskMeta } from "../hooks";
import type { Task, TodoList } from "../model";
import { reorder } from "../repository";
import { sortModeOf, useTodoStore } from "../store";
import {
  COMPLETE_DELAY_MS,
  byCompletedDesc,
  byDue,
  byManual,
  completedWindowStart,
  formatDayHeading,
  groupByList,
  groupUpcoming,
  matchesSelection,
  sortTasks,
  type TodoSelection,
} from "../views";
import { ListChip } from "./TaskBadges";
import {
  CompletedSection,
  SectionHeading,
  SortableTaskRows,
  TaskRows,
  type RowContext,
} from "./TaskSections";

const JOURNAL_PATH = "/journal";

function rowElements(container: HTMLElement | null): HTMLElement[] {
  return container ? [...container.querySelectorAll<HTMLElement>("[data-task-row]")] : [];
}

/** Tasks of the active list or smart view, with the row shortcuts. */
export function TaskListView({
  selection,
  lists,
  today,
}: {
  selection: TodoSelection;
  lists: TodoList[];
  today: DateISO;
}) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const { data, loading } = useSelectionTasks(selection, today);
  const completing = useTodoStore((state) => state.completing);
  const sortMode = useTodoStore((state) =>
    selection.kind === "list" ? sortModeOf(state, selection.listId) : "due",
  );
  const focusedTaskId = useTodoStore((state) => state.focusedTaskId);

  // Just-completed tasks stay among the open ones (checked) until their animation ends.
  const open = useMemo(() => {
    const snapshots = Object.values(completing).filter((task) =>
      matchesSelection(task, selection, today),
    );
    return [...data.open.filter((task) => !completing[task.id]), ...snapshots];
  }, [completing, data.open, selection, today]);
  const done = useMemo(
    () => data.done.filter((task) => !completing[task.id]).sort(byCompletedDesc),
    [completing, data.done],
  );

  const meta = useTaskMeta(useMemo(() => [...open, ...done].map((task) => task.id), [open, done]));
  const listsById = useMemo(() => new Map(lists.map((list) => [list.id, list])), [lists]);
  const context: RowContext = {
    meta,
    listsById: selection.kind === "view" ? listsById : undefined,
  };

  const windowStart = completedWindowStart();
  const recentDone = done.filter((task) => (task.completedAt ?? "") >= windowStart);
  const olderDone = done.filter((task) => (task.completedAt ?? "") < windowStart);

  const sortedOpen = sortTasks(open, sortMode);
  const manualList = selection.kind === "list" && sortMode === "manual" ? selection.listId : null;

  // Row shortcuts ------------------------------------------------------------------------------

  const findTask = (id: string | null): Task | undefined =>
    id ? [...open, ...done].find((task) => task.id === id) : undefined;

  const focusRow = (offset: number) => {
    const rows = rowElements(containerRef.current);
    const index = rows.findIndex((row) => row.dataset.taskRow === focusedTaskId);
    rows[Math.min(Math.max(index + offset, 0), rows.length - 1)]?.focus();
  };

  const hasFocus = focusedTaskId !== null;
  useHotkey("todo.focusPrev", () => focusRow(-1), { enabled: hasFocus });
  useHotkey("todo.focusNext", () => focusRow(1), { enabled: hasFocus });
  useHotkey(
    "todo.toggleDone",
    () => {
      const task = findTask(focusedTaskId);
      if (!task) return;
      const rows = rowElements(containerRef.current);
      const index = rows.findIndex((row) => row.dataset.taskRow === task.id);
      void toggleTaskDone(task);
      // The row moves to "Completadas": keep the keyboard on the list.
      if (task.status === "open") {
        setTimeout(() => {
          const next = rows[index + 1] ?? rows[index - 1];
          if (next?.isConnected) next.focus();
        }, COMPLETE_DELAY_MS + 50);
      }
    },
    { enabled: hasFocus },
  );
  useHotkey(
    "todo.openDetail",
    () => {
      const state = useTodoStore.getState();
      if (!focusedTaskId) return;
      if (state.confirmDeleteId === focusedTaskId) void confirmDeleteTask(focusedTaskId);
      else state.openDetail(focusedTaskId);
    },
    { enabled: hasFocus },
  );
  useHotkey("todo.delete", () => useTodoStore.getState().setConfirmDelete(focusedTaskId), {
    enabled: hasFocus,
  });

  const move = (offset: -1 | 1) => {
    if (!manualList || !focusedTaskId) return;
    const ids = sortedOpen.map((task) => task.id);
    const index = ids.indexOf(focusedTaskId);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    useTodoStore.getState().requestFocus(focusedTaskId);
    void reorder(manualList, ids);
  };
  useHotkey("todo.moveUp", () => move(-1), { enabled: hasFocus && manualList !== null });
  useHotkey("todo.moveDown", () => move(1), { enabled: hasFocus && manualList !== null });

  // Rendering ----------------------------------------------------------------------------------

  const completed = <CompletedSection recent={recentDone} older={olderDone} context={context} />;
  let body: ReactNode;

  if (selection.kind === "list") {
    body = (
      <>
        {sortedOpen.length === 0 && !loading ? (
          <EmptyState title={t("todo.empty.list")} />
        ) : manualList ? (
          <SortableTaskRows
            tasks={sortedOpen}
            context={context}
            onReorder={(ids) => void reorder(manualList, ids)}
          />
        ) : (
          <TaskRows tasks={sortedOpen} context={context} />
        )}
        {completed}
      </>
    );
  } else if (selection.view === "today") {
    const overdue = open.filter((task) => (task.dueDate ?? "") < today).sort(byDue);
    const dueToday = open.filter((task) => task.dueDate === today).sort(byDue);
    body = (
      <>
        {overdue.length + dueToday.length === 0 && !loading ? (
          <EmptyState
            icon={<Cloud size={30} />}
            title={t("todo.empty.today")}
            action={
              <Button variant="soft" size="sm" onClick={() => navigate(JOURNAL_PATH)}>
                {t("todo.empty.todayLink")}
              </Button>
            }
          />
        ) : null}
        {overdue.length > 0 ? (
          <>
            <SectionHeading tone="danger">{t("todo.section.overdue")}</SectionHeading>
            <TaskRows tasks={overdue} context={context} />
          </>
        ) : null}
        {dueToday.length > 0 ? (
          <>
            {overdue.length > 0 ? <SectionHeading>{t("todo.section.today")}</SectionHeading> : null}
            <TaskRows tasks={dueToday} context={context} />
          </>
        ) : null}
        {completed}
      </>
    );
  } else if (selection.view === "upcoming") {
    const groups = groupUpcoming([...open].sort(byDue), today);
    body =
      groups.length === 0 && !loading ? (
        <EmptyState icon={<StarSmall size={30} />} title={t("todo.empty.upcoming")} />
      ) : (
        groups.map((group) => (
          <section key={group.date ?? "later"}>
            <SectionHeading>
              {group.date === null
                ? t("todo.section.later")
                : group.date === today
                  ? t("todo.due.today")
                  : formatDayHeading(group.date)}
            </SectionHeading>
            <TaskRows tasks={group.tasks} context={context} />
          </section>
        ))
      );
  } else if (selection.view === "overdue") {
    const overdue = [...open].sort(byDue);
    body =
      overdue.length === 0 && !loading ? (
        <EmptyState icon={<Sparkle size={30} />} title={t("todo.empty.overdue")} />
      ) : (
        <TaskRows tasks={overdue} context={context} />
      );
  } else {
    const groups = groupByList(
      [...open].sort(byManual),
      lists.filter((list) => !list.isArchived),
    );
    body =
      groups.length === 0 && !loading ? (
        <EmptyState title={t("todo.empty.all")} />
      ) : (
        groups.map((group) => (
          <section key={group.list.id}>
            <div className="mt-4 mb-1 px-3">
              <ListChip list={group.list} />
            </div>
            <TaskRows tasks={group.tasks} context={{ meta }} />
          </section>
        ))
      );
  }

  return (
    <div ref={containerRef} className="pb-8">
      {body}
    </div>
  );
}
