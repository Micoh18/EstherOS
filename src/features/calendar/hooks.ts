import { startTransition, useEffect, useMemo, useState } from "react";
import { addMonths, startOfMonth } from "date-fns";
import { onDbChanged, type DbTable } from "@/shared/db";
import { addDaysISO, parseDateISO, toDateISO, toYearMonth, type DateISO } from "@/shared/lib/dates";
import { useCurrentDay } from "@/shared/lib";
import { log } from "@/shared/lib/log";
import { t } from "@/shared/i18n";
import { useToast } from "@/shared/ui";
import {
  datesWithEntriesInMonth,
  useJournalEntriesForDate,
  type JournalEntry,
} from "@/features/journal";
import { getAllSettings, SETTING_DEFAULTS } from "@/features/settings";
import { listTasks, useTasksForDate, useTasksInRange, type Task } from "@/features/todo";
import { toWeekStartsOn, type CalendarView } from "./grid";
import { groupByDay } from "./layout";
import type { EventOccurrence } from "./model";
import {
  createEvent,
  deleteEvent,
  getEvent,
  listEventsInRange,
  listEventTags,
  moveEvent,
  setEventTags,
} from "./repository";

export interface QueryState<T> {
  data: T | undefined;
  /** True until the first load finishes (later reloads keep the previous data on screen). */
  loading: boolean;
  error: unknown;
}

/**
 * Runs `load` and re-runs it when `key` changes or any of `tables` changes in the db. Keeps the
 * previous data while reloading so navigation never flashes empty.
 */
function useDbQuery<T>(tables: readonly DbTable[], key: string, load: () => Promise<T>) {
  const [state, setState] = useState<QueryState<T>>({
    data: undefined,
    loading: true,
    error: null,
  });
  const [version, setVersion] = useState(0);
  const tablesKey = tables.join(",");

  useEffect(() => {
    const unsubscribe = tablesKey
      .split(",")
      .map((table) => onDbChanged(table as DbTable, () => setVersion((v) => v + 1)));
    return () => unsubscribe.forEach((off) => off());
  }, [tablesKey]);

  useEffect(() => {
    let cancelled = false;
    load().then(
      (data) => {
        // A transition: the grid re-renders with the new period's data in slices, so a month
        // full of events does not block the slide animation for a whole long frame.
        if (!cancelled) startTransition(() => setState({ data, loading: false, error: null }));
      },
      (error: unknown) => {
        log.error("calendar query failed", key, error);
        if (!cancelled) setState((prev) => ({ ...prev, loading: false, error }));
      },
    );
    return () => {
      cancelled = true;
    };
    // `load` is recreated every render; `key` identifies what it loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version]);

  return state;
}

// Settings ------------------------------------------------------------------------------------

export interface CalendarSettings {
  weekStartsOn: ReturnType<typeof toWeekStartsOn>;
  timeFormat: "12h" | "24h";
  defaultView: CalendarView;
}

function fromSettings(settings: typeof SETTING_DEFAULTS): CalendarSettings {
  return {
    weekStartsOn: toWeekStartsOn(settings.week_starts_on),
    timeFormat: settings.time_format,
    defaultView: settings.default_calendar_view,
  };
}

const DEFAULT_SETTINGS = fromSettings(SETTING_DEFAULTS);

/** Settings the calendar depends on, with defaults until they load. */
export function useCalendarSettings(): CalendarSettings & { loaded: boolean } {
  const { data } = useDbQuery(["setting"], "settings", getAllSettings);
  return useMemo(
    () => ({ ...(data ? fromSettings(data) : DEFAULT_SETTINGS), loaded: data !== undefined }),
    [data],
  );
}

// Events --------------------------------------------------------------------------------------

/** Occurrences overlapping `[from, to]`, recurrences expanded. */
export function useEventsInRange(from: DateISO, to: DateISO): QueryState<EventOccurrence[]> {
  return useDbQuery(["event"], `events:${from}:${to}`, () => listEventsInRange(from, to));
}

/** Occurrences of one day (for Today and other features). */
export function useEventsForDate(date: DateISO | Date): QueryState<EventOccurrence[]> {
  const day = typeof date === "string" ? date : toDateISO(date);
  return useEventsInRange(day, day);
}

/** Occurrences of the range grouped by every day they touch. */
export function useEventsByDay(from: DateISO, to: DateISO) {
  const query = useEventsInRange(from, to);
  const byDay = useMemo(() => groupByDay(query.data ?? [], from, to), [query.data, from, to]);
  return { ...query, byDay };
}

// Cross-feature indicators --------------------------------------------------------------------

export interface DayIndicator {
  /** Open tasks due that day. */
  tasks: number;
  journal: boolean;
}

function monthsBetween(from: DateISO, to: DateISO): string[] {
  const months: string[] = [];
  let month = startOfMonth(parseDateISO(from));
  const last = parseDateISO(to);
  while (month <= last) {
    months.push(toYearMonth(month));
    month = addMonths(month, 1);
  }
  return months;
}

async function loadIndicators(from: DateISO, to: DateISO) {
  const [tasks, ...journalMonths] = await Promise.all([
    listTasks({ status: "open", dueAfter: addDaysISO(from, -1), dueBefore: addDaysISO(to, 1) }),
    ...monthsBetween(from, to).map((month) => datesWithEntriesInMonth(month)),
  ]);
  const byDay = new Map<DateISO, DayIndicator>();
  const entry = (day: DateISO) => {
    let value = byDay.get(day);
    if (!value) byDay.set(day, (value = { tasks: 0, journal: false }));
    return value;
  };
  for (const task of tasks) if (task.dueDate) entry(task.dueDate).tasks += 1;
  for (const day of journalMonths.flat()) entry(day.date).journal = true;
  return byDay;
}

/** Journal dot and due-task counter per day of the range (month cells). */
export function useDayIndicators(from: DateISO, to: DateISO) {
  return useDbQuery(["task", "todo_list", "journal_entry"], `indicators:${from}:${to}`, () =>
    loadIndicators(from, to),
  );
}

export interface DaySummary {
  tasks: Task[];
  journal: JournalEntry[];
}

/** Tasks due and journal entries of one day, for the side panel. */
export function useDaySummary(date: DateISO | null): QueryState<DaySummary> {
  const today = useCurrentDay();
  const day = date ?? today;
  const { data: dayTasks, loading: tasksLoading, error: tasksError } = useTasksForDate(day);
  const {
    data: entries,
    loading: journalLoading,
    error: journalError,
  } = useJournalEntriesForDate(day);
  return useMemo(
    () => ({
      data: { tasks: dayTasks, journal: entries },
      loading: tasksLoading || journalLoading,
      error: tasksError ?? journalError ?? null,
    }),
    [dayTasks, entries, tasksLoading, journalLoading, tasksError, journalError],
  );
}

/** Tasks due per day of `[from, to]` for the week and day grids (timed and date-only). */
export function useTasksByDay(from: DateISO, to: DateISO): Map<DateISO, Task[]> {
  const tasks = useTasksInRange(from, to);
  return useMemo(() => {
    const byDay = new Map<DateISO, Task[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const list = byDay.get(task.dueDate);
      if (list) list.push(task);
      else byDay.set(task.dueDate, [task]);
    }
    return byDay;
  }, [tasks]);
}

// Actions -------------------------------------------------------------------------------------

/** Event mutations with their toasts (success and "No pude…" errors). */
export function useEventActions() {
  const { toast } = useToast();

  return useMemo(
    () => ({
      /** Moves the series so the occurrence shown on `fromDay` lands on `toDay`. */
      async move(occurrence: EventOccurrence, fromDay: DateISO, toDay: DateISO) {
        if (fromDay === toDay) return;
        try {
          await moveEvent(occurrence.id, toDay, fromDay);
          if (occurrence.isRecurring) {
            toast({
              title: t("calendar.toast.seriesMoved"),
              description: t("calendar.toast.seriesMovedHint"),
            });
          }
        } catch (error) {
          log.error("move event failed", error);
          toast({ title: t("calendar.toast.moveError"), variant: "danger" });
        }
      },
      async duplicate(eventId: string) {
        try {
          const [event, tags] = await Promise.all([getEvent(eventId), listEventTags(eventId)]);
          if (!event) return;
          const copy = await createEvent({
            ...event,
            title: t("calendar.event.copySuffix", { title: event.title }).slice(0, 200),
          });
          if (tags.length)
            await setEventTags(
              copy.id,
              tags.map((tag) => tag.id),
            );
          toast({ title: t("calendar.toast.duplicated"), variant: "success" });
        } catch (error) {
          log.error("duplicate event failed", error);
          toast({ title: t("calendar.toast.saveError"), variant: "danger" });
        }
      },
      async remove(eventId: string) {
        try {
          await deleteEvent(eventId);
          toast({ title: t("calendar.toast.deleted") });
          return true;
        } catch (error) {
          log.error("delete event failed", error);
          toast({ title: t("calendar.toast.deleteError"), variant: "danger" });
          return false;
        }
      },
    }),
    [toast],
  );
}

// Clock ---------------------------------------------------------------------------------------

/** Current time, refreshed every `intervalMs` (for the "now" line). */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
