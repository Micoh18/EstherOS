import { differenceInCalendarDays, format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { addDaysISO, nowUTC, parseDateISO, type DateISO } from "@/shared/lib/dates";
import type { Task, TaskPriority, TodoList } from "./model";

// Selection -------------------------------------------------------------------------------------

export const SMART_VIEWS = ["today", "upcoming", "overdue", "all"] as const;
export type SmartView = (typeof SMART_VIEWS)[number];

export type TodoSelection = { kind: "view"; view: SmartView } | { kind: "list"; listId: string };

export const SORT_MODES = ["manual", "due", "priority"] as const;
export type SortMode = (typeof SORT_MODES)[number];

/** Days of "Próximas" grouped one by one; the rest goes to "Más adelante". */
export const UPCOMING_DAYS = 14;
/** The "Completadas" section shows this many days by default ("Ver más" shows the rest). */
export const COMPLETED_WINDOW_DAYS = 30;
/** Time a just-completed row stays in place before moving to "Completadas". */
export const COMPLETE_DELAY_MS = 600;

/** Whether a top-level task belongs to the open part of a selection (ignoring its status). */
export function matchesSelection(task: Task, selection: TodoSelection, today: DateISO): boolean {
  if (task.parentId !== null) return false;
  if (selection.kind === "list") return task.listId === selection.listId;
  switch (selection.view) {
    case "today":
      return task.dueDate !== null && task.dueDate <= today;
    case "upcoming":
      return task.dueDate !== null && task.dueDate > today;
    case "overdue":
      return task.dueDate !== null && task.dueDate < today;
    case "all":
      return true;
  }
}

/** Quick capture defaults per smart view, so the new task shows up where it was typed. */
export function defaultDueFor(selection: TodoSelection, today: DateISO): DateISO | null {
  if (selection.kind === "list") return null;
  if (selection.view === "today" || selection.view === "overdue") return today;
  if (selection.view === "upcoming") return addDaysISO(today, 1);
  return null;
}

// Sorting ---------------------------------------------------------------------------------------

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2, none: 3 };

export function byManual(a: Task, b: Task): number {
  return a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt);
}

/** Dated tasks first (earliest first, timed before untimed), then the undated ones. */
export function byDue(a: Task, b: Task): number {
  if (a.dueDate !== b.dueDate) {
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  }
  return (a.dueTime ?? "99:99").localeCompare(b.dueTime ?? "99:99") || byManual(a, b);
}

export function byPriority(a: Task, b: Task): number {
  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || byDue(a, b);
}

export function sortTasks(tasks: readonly Task[], mode: SortMode): Task[] {
  const compare = mode === "manual" ? byManual : mode === "due" ? byDue : byPriority;
  return [...tasks].sort(compare);
}

/** Most recently completed first. */
export function byCompletedDesc(a: Task, b: Task): number {
  return (b.completedAt ?? "").localeCompare(a.completedAt ?? "");
}

export function completedWindowStart(now: Date = new Date()): string {
  return nowUTC(subDays(now, COMPLETED_WINDOW_DAYS));
}

// Grouping --------------------------------------------------------------------------------------

export interface DayGroup {
  /** `YYYY-MM-DD`, or `null` for "Más adelante". */
  date: DateISO | null;
  tasks: Task[];
}

/** Upcoming tasks by day for the next `days` days, then one "later" group. Keeps input order. */
export function groupUpcoming(
  tasks: readonly Task[],
  today: DateISO,
  days = UPCOMING_DAYS,
): DayGroup[] {
  const last = addDaysISO(today, days);
  const byDate = new Map<DateISO, Task[]>();
  const later: Task[] = [];
  for (const task of tasks) {
    if (task.dueDate === null) continue;
    if (task.dueDate > last) later.push(task);
    else byDate.set(task.dueDate, [...(byDate.get(task.dueDate) ?? []), task]);
  }
  const groups: DayGroup[] = [...byDate.keys()]
    .sort()
    .map((date) => ({ date, tasks: byDate.get(date) ?? [] }));
  if (later.length > 0) groups.push({ date: null, tasks: later });
  return groups;
}

export interface ListGroup {
  list: TodoList;
  tasks: Task[];
}

/** Tasks grouped by list, following the order of `lists`. Tasks of unknown lists are skipped. */
export function groupByList(tasks: readonly Task[], lists: readonly TodoList[]): ListGroup[] {
  return lists
    .map((list) => ({ list, tasks: tasks.filter((task) => task.listId === list.id) }))
    .filter((group) => group.tasks.length > 0);
}

// Labels ----------------------------------------------------------------------------------------

export type DueTone = "overdue" | "today" | "soon" | "later";

export interface DueLabel {
  /** Relative day, or `null` when a fixed date (`dateText`) must be shown instead. */
  relative: "today" | "tomorrow" | "yesterday" | "daysAgo" | null;
  daysAgo: number;
  /** Short date for days without a relative name, e.g. "Vie 24" or "3 nov". */
  dateText: string;
  tone: DueTone;
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase("es") + text.slice(1);
}

/** Relative description of a due date, without i18n (the component turns it into text). */
export function describeDue(dueDate: DateISO, today: DateISO): DueLabel {
  const date = parseDateISO(dueDate);
  const diff = differenceInCalendarDays(date, parseDateISO(today));
  const sameYear = dueDate.slice(0, 4) === today.slice(0, 4);
  const dateText =
    diff > 0 && diff < 7
      ? capitalize(format(date, "EEE d", { locale: es }).replace(".", ""))
      : format(date, sameYear ? "d MMM" : "d MMM yyyy", { locale: es }).replace(".", "");
  if (diff === 0) return { relative: "today", daysAgo: 0, dateText, tone: "today" };
  if (diff === 1) return { relative: "tomorrow", daysAgo: 0, dateText, tone: "soon" };
  if (diff === -1) return { relative: "yesterday", daysAgo: 1, dateText, tone: "overdue" };
  if (diff < 0) return { relative: "daysAgo", daysAgo: -diff, dateText, tone: "overdue" };
  return { relative: null, daysAgo: 0, dateText, tone: diff < 7 ? "soon" : "later" };
}

/** Heading of a day group, e.g. "Lunes 20 oct". */
export function formatDayHeading(date: DateISO): string {
  return capitalize(format(parseDateISO(date), "EEEE d MMM", { locale: es }).replace(".", ""));
}

/** Long date for headers, e.g. "Domingo, 18 de octubre". */
export function formatLongDate(date: DateISO): string {
  return capitalize(format(parseDateISO(date), "EEEE, d 'de' MMMM", { locale: es }));
}

/** Local date and time of a UTC timestamp, e.g. "18 oct 2026, 14:30". */
export function formatTimestamp(utc: string): string {
  const date = new Date(utc);
  return Number.isNaN(date.getTime()) ? "" : format(date, "d MMM yyyy, HH:mm", { locale: es });
}
