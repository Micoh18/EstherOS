import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { addDaysISO, toDateISO, type DateRange, type WeekStartsOn } from "@/shared/lib/dates";

export const CALENDAR_VIEWS = ["month", "week", "day"] as const;
export type CalendarView = (typeof CALENDAR_VIEWS)[number];

/** Extra days loaded around the visible period, so neighbours and drags have data ready. */
export const RANGE_PADDING_DAYS = 7;

/** Full weeks covering the month (5 or 6 rows), each week starting on `weekStartsOn`. */
export function buildMonthGrid(month: Date, weekStartsOn: WeekStartsOn): Date[][] {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn }),
  });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

/** The seven days of the week containing `date`. */
export function weekDays(date: Date, weekStartsOn: WeekStartsOn): Date[] {
  const first = startOfWeek(date, { weekStartsOn });
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}

/** Days drawn by a view around `focused`. */
export function visibleRange(
  view: CalendarView,
  focused: Date,
  weekStartsOn: WeekStartsOn,
): DateRange {
  if (view === "day") return { from: toDateISO(focused), to: toDateISO(focused) };
  if (view === "week") {
    const days = weekDays(focused, weekStartsOn);
    return { from: toDateISO(days[0]), to: toDateISO(days[6]) };
  }
  const weeks = buildMonthGrid(focused, weekStartsOn);
  return { from: toDateISO(weeks[0][0]), to: toDateISO(weeks[weeks.length - 1][6]) };
}

/** Range to query: the visible days plus `RANGE_PADDING_DAYS` on each side. */
export function loadRange(view: CalendarView, focused: Date, weekStartsOn: WeekStartsOn) {
  const { from, to } = visibleRange(view, focused, weekStartsOn);
  return {
    from: addDaysISO(from, -RANGE_PADDING_DAYS),
    to: addDaysISO(to, RANGE_PADDING_DAYS),
  };
}

/** Moves `date` one period of `view` forward (1) or back (-1). */
export function shiftPeriod(view: CalendarView, date: Date, direction: 1 | -1): Date {
  if (view === "month") return addMonths(date, direction);
  if (view === "week") return addWeeks(date, direction);
  return addDays(date, direction);
}

/** Stable identifier of the period shown, used to key the slide transition. */
export function periodKey(view: CalendarView, focused: Date, weekStartsOn: WeekStartsOn) {
  return `${view}:${visibleRange(view, focused, weekStartsOn).from}`;
}

/** Narrows the `week_starts_on` setting (0..6) to the date-fns type. */
export function toWeekStartsOn(value: number): WeekStartsOn {
  return (Number.isInteger(value) && value >= 0 && value <= 6 ? value : 1) as WeekStartsOn;
}
