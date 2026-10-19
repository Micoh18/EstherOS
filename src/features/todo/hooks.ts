import { useEffect, useRef, useState } from "react";
import { onDbChanged, type DbTable, type Tag, listTagsForMany } from "@/shared/db";
import { log } from "@/shared/lib/log";
import { addDaysISO, toDateISO, type DateISO } from "@/shared/lib/dates";
import { useCurrentDay } from "@/shared/lib";
import type { Task, TodoList } from "./model";
import {
  countOpenTasks,
  deleteTask,
  getTask,
  listLists,
  listOverdue,
  listSubtasks,
  listTaskTags,
  listTasks,
  listTasksForDate,
  subtaskProgress,
  toggleDone,
  type OpenTaskCounts,
} from "./repository";
import { useTodoStore } from "./store";
import { COMPLETE_DELAY_MS, type TodoSelection } from "./views";

// Generic loader ------------------------------------------------------------------------------

export interface DbQuery<T> {
  data: T;
  /** True until the data for the current `key` has arrived (stale data is kept meanwhile). */
  loading: boolean;
  /** Why the last load for the current `key` failed, or null. */
  error: unknown;
}

/**
 * Loads data from the repository and reloads it whenever one of `tables` changes. `key` must
 * change whenever the inputs of `load` change.
 */
export function useDbQuery<T>(
  key: string,
  load: () => Promise<T>,
  tables: readonly DbTable[],
  initial: T,
): DbQuery<T> {
  const [state, setState] = useState<{ key: string | null; data: T; error: unknown }>({
    key: null,
    data: initial,
    error: null,
  });
  const [version, setVersion] = useState(0);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  const tablesKey = tables.join(",");
  useEffect(() => {
    const unsubscribe = tablesKey
      .split(",")
      .map((table) => onDbChanged(table as DbTable, () => setVersion((v) => v + 1)));
    return () => unsubscribe.forEach((off) => off());
  }, [tablesKey]);

  useEffect(() => {
    let cancelled = false;
    loadRef.current().then(
      (data) => {
        if (!cancelled) setState({ key, data, error: null });
      },
      (error: unknown) => {
        log.error("todo: load failed", key, error);
        if (!cancelled) setState((current) => ({ ...current, key, error }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key, version]);

  const current = state.key === key;
  return { data: state.data, loading: !current, error: current ? state.error : null };
}

const TASK_TABLES: readonly DbTable[] = ["task", "todo_list"];
const NO_TASKS: Task[] = [];

/** Local `YYYY-MM-DD` of today: the app-wide day source, updated at midnight and on focus. */
export const useToday = useCurrentDay;

// Lists ---------------------------------------------------------------------------------------

export function useLists(includeArchived = true): DbQuery<TodoList[]> {
  return useDbQuery(
    `lists:${includeArchived}`,
    () => listLists({ includeArchived }),
    ["todo_list"],
    [] as TodoList[],
  );
}

const NO_COUNTS: OpenTaskCounts = { today: 0, upcoming: 0, overdue: 0, all: 0, byList: new Map() };

export function useOpenCounts(today: DateISO): OpenTaskCounts {
  return useDbQuery(`counts:${today}`, () => countOpenTasks(today), TASK_TABLES, NO_COUNTS).data;
}

// Tasks ---------------------------------------------------------------------------------------

export interface SelectionTasks {
  /** Open top-level tasks of the selection (unsorted). */
  open: Task[];
  /** Completed top-level tasks for the "Completadas" section (list views and Hoy only). */
  done: Task[];
}

const NO_SELECTION_TASKS: SelectionTasks = { open: [], done: [] };

async function loadSelection(selection: TodoSelection, today: DateISO): Promise<SelectionTasks> {
  if (selection.kind === "list") {
    const tasks = await listTasks({
      listId: selection.listId,
      parentId: null,
      includeArchived: true,
    });
    return {
      open: tasks.filter((task) => task.status === "open"),
      done: tasks.filter((task) => task.status === "done"),
    };
  }
  const open = { status: "open", parentId: null } as const;
  switch (selection.view) {
    case "today": {
      const [dueToday, overdue] = await Promise.all([
        listTasks({ dueDate: today, parentId: null }),
        listTasks({ ...open, dueBefore: today }),
      ]);
      return {
        open: [...overdue, ...dueToday.filter((task) => task.status === "open")],
        done: dueToday.filter((task) => task.status === "done"),
      };
    }
    case "upcoming":
      return { open: await listTasks({ ...open, dueAfter: today }), done: [] };
    case "overdue":
      return { open: await listTasks({ ...open, dueBefore: today }), done: [] };
    case "all":
      return { open: await listTasks(open), done: [] };
  }
}

export function useSelectionTasks(
  selection: TodoSelection,
  today: DateISO,
): DbQuery<SelectionTasks> {
  const key =
    selection.kind === "list"
      ? `list:${selection.listId}:${today}`
      : `view:${selection.view}:${today}`;
  return useDbQuery(key, () => loadSelection(selection, today), TASK_TABLES, NO_SELECTION_TASKS);
}

export interface TaskMeta {
  progress: Map<string, { done: number; total: number }>;
  tags: Map<string, Tag[]>;
}

const NO_META: TaskMeta = { progress: new Map(), tags: new Map() };

/** Subtask progress and tags of many rows at once. */
export function useTaskMeta(taskIds: readonly string[]): TaskMeta {
  const ids = [...taskIds].sort();
  return useDbQuery(
    `meta:${ids.join(",")}`,
    async () => {
      const [progress, tags] = await Promise.all([
        subtaskProgress(ids),
        listTagsForMany("task", ids),
      ]);
      return { progress, tags };
    },
    ["task", "tag"],
    NO_META,
  ).data;
}

export function useTask(taskId: string): DbQuery<Task | null> {
  return useDbQuery(`task:${taskId}`, () => getTask(taskId), TASK_TABLES, null);
}

export function useSubtasks(parentId: string): Task[] {
  return useDbQuery(`subtasks:${parentId}`, () => listSubtasks(parentId), TASK_TABLES, NO_TASKS)
    .data;
}

export function useTaskTags(taskId: string): Tag[] {
  return useDbQuery(`tags:${taskId}`, () => listTaskTags(taskId), ["task", "tag"], [] as Tag[])
    .data;
}

/**
 * Tasks due on `date` (open and done, open first; subtasks included), skipping archived lists.
 * Public: used by Hoy and the calendar day panel.
 */
export function useTasksForDate(date: DateISO | Date): DbQuery<Task[]> {
  const day = typeof date === "string" ? date : toDateISO(date);
  return useDbQuery(`date:${day}`, () => listTasksForDate(day), TASK_TABLES, NO_TASKS);
}

/**
 * Open tasks due before `today` (by default the app-wide current day), earliest first. Public:
 * used by Hoy, which passes its own day so both lists switch at the same moment.
 */
export function useOverdueTasks(today?: DateISO): DbQuery<Task[]> {
  const currentDay = useCurrentDay();
  const day = today ?? currentDay;
  return useDbQuery(`overdue:${day}`, () => listOverdue(day), TASK_TABLES, NO_TASKS);
}

/**
 * Top-level and subtasks due between `from` and `to` (inclusive), open and done, skipping archived
 * lists. Public: the calendar draws them in its week and day views.
 */
export function useTasksInRange(from: DateISO, to: DateISO): Task[] {
  return useDbQuery(
    `range:${from}:${to}`,
    () => listTasks({ dueAfter: addDaysISO(from, -1), dueBefore: addDaysISO(to, 1) }),
    TASK_TABLES,
    NO_TASKS,
  ).data;
}

/**
 * Snapshots (already marked done) of the tasks playing the completion animation, by id. Lists
 * that only load open tasks keep these rows on screen until the animation ends. Public: Hoy.
 */
export function useCompletingTasks(): Record<string, Task> {
  return useTodoStore((state) => state.completing);
}

// Settings ------------------------------------------------------------------------------------

// Loaded lazily: the settings index re-exports a dev panel that imports this feature.
async function readSetting<K extends "week_starts_on" | "time_format">(key: K) {
  const { getSetting } = await import("@/features/settings");
  return getSetting(key);
}

export function useWeekStartsOn(): 0 | 1 {
  const value = useDbQuery(
    "setting:week",
    () => readSetting("week_starts_on"),
    ["setting"],
    1,
  ).data;
  return value === 0 ? 0 : 1;
}

export function useHourCycle(): 12 | 24 {
  const value = useDbQuery(
    "setting:time",
    () => readSetting("time_format"),
    ["setting"],
    "24h",
  ).data;
  return value === "12h" ? 12 : 24;
}

// Actions -------------------------------------------------------------------------------------

/**
 * Completes or reopens a task. A completed task stays in place (checked) for the completion
 * animation and then moves to "Completadas".
 */
export async function toggleTaskDone(task: Task): Promise<void> {
  const { startCompleting, finishCompleting } = useTodoStore.getState();
  if (task.status === "open") {
    startCompleting(task);
    setTimeout(() => finishCompleting(task.id), COMPLETE_DELAY_MS);
  }
  try {
    await toggleDone(task.id);
  } catch (error) {
    finishCompleting(task.id);
    log.error("todo: toggle failed", error);
  }
}

/** Deletes after the inline confirmation and keeps keyboard focus in the list. */
export async function confirmDeleteTask(taskId: string): Promise<void> {
  const rows = [...document.querySelectorAll<HTMLElement>("[data-task-row]")];
  const index = rows.findIndex((row) => row.dataset.taskRow === taskId);
  const neighbor = rows[index + 1] ?? rows[index - 1];
  const state = useTodoStore.getState();
  state.setConfirmDelete(null);
  if (state.selectedTaskId === taskId) state.closeDetail();
  await deleteTask(taskId);
  state.requestFocus(neighbor?.dataset.taskRow ?? null);
}
