import { differenceInMinutes } from "date-fns";
import {
  addDaysISO,
  datePart,
  parseDateISO,
  parseLocalDateTime,
  type DateISO,
} from "@/shared/lib/dates";
import type { EventOccurrence } from "./model";

export const MINUTES_PER_DAY = 24 * 60;
/** Max side-by-side columns for overlapping events; the rest collapse into "+N". */
export const MAX_COLUMNS = 4;

/** Last day an occurrence covers. A timed event ending exactly at 00:00 does not touch that day. */
export function lastDayOf(occurrence: EventOccurrence): DateISO {
  if (occurrence.allDay || !occurrence.startAt || !occurrence.endAt) {
    return occurrence.occurrenceDate;
  }
  const endDay = datePart(occurrence.endAt);
  const endsAtMidnight = occurrence.endAt.endsWith("T00:00:00");
  return endsAtMidnight && occurrence.endAt > occurrence.startAt ? addDaysISO(endDay, -1) : endDay;
}

export function occursOn(occurrence: EventOccurrence, day: DateISO): boolean {
  return occurrence.occurrenceDate <= day && day <= lastDayOf(occurrence);
}

/** Occurrences touching `day`, in calendar order (all-day first, then by start). */
export function occurrencesOn(occurrences: readonly EventOccurrence[], day: DateISO) {
  return occurrences.filter((occurrence) => occursOn(occurrence, day));
}

/** Groups occurrences by every day they touch, limited to `[from, to]`. */
export function groupByDay(
  occurrences: readonly EventOccurrence[],
  from: DateISO,
  to: DateISO,
): Map<DateISO, EventOccurrence[]> {
  const byDay = new Map<DateISO, EventOccurrence[]>();
  for (const occurrence of occurrences) {
    let day = occurrence.occurrenceDate < from ? from : occurrence.occurrenceDate;
    const last = lastDayOf(occurrence);
    while (day <= last && day <= to) {
      const list = byDay.get(day);
      if (list) list.push(occurrence);
      else byDay.set(day, [occurrence]);
      day = addDaysISO(day, 1);
    }
  }
  return byDay;
}

export interface DaySegment {
  occurrence: EventOccurrence;
  /** Minutes from the start of the day, clamped to the day. */
  start: number;
  end: number;
}

/** Part of each timed occurrence that falls on `day` (multi-day events are cut per day). */
export function timedSegmentsFor(
  occurrences: readonly EventOccurrence[],
  day: DateISO,
): DaySegment[] {
  const dayStart = parseDateISO(day);
  const segments: DaySegment[] = [];
  for (const occurrence of occurrences) {
    if (occurrence.allDay || !occurrence.startAt || !occurrence.endAt) continue;
    if (!occursOn(occurrence, day)) continue;
    const start = differenceInMinutes(parseLocalDateTime(occurrence.startAt), dayStart);
    const end = differenceInMinutes(parseLocalDateTime(occurrence.endAt), dayStart);
    segments.push({
      occurrence,
      start: Math.max(0, start),
      end: Math.min(MINUTES_PER_DAY, end),
    });
  }
  return segments;
}

export interface TimedItem {
  start: number;
  end: number;
}

export interface PlacedItem<T> {
  item: T;
  /** Zero-based column inside its overlap group. */
  column: number;
  /** Columns the group is split into (at most `maxColumns`). */
  columns: number;
}

export interface OverflowGroup<T> {
  /** Hidden items, drawn as one "+N" marker in the last column. */
  items: T[];
  start: number;
  end: number;
  column: number;
  columns: number;
}

export interface ColumnLayout<T> {
  placed: PlacedItem<T>[];
  overflow: OverflowGroup<T>[];
}

/**
 * Greedy column layout for overlapping timed items. Items are sorted by start (longer first on
 * ties) and split into groups of transitively overlapping items; inside a group each item takes
 * the first column whose last item already ended. A group needing more than `maxColumns` shows
 * `maxColumns - 1` columns and collapses the rest into an overflow marker in the last column.
 * Items shorter than `minDuration` count as that long, so tiny blocks never stack unreadably.
 */
export function layoutColumns<T extends TimedItem>(
  items: readonly T[],
  { maxColumns = MAX_COLUMNS, minDuration = 15 } = {},
): ColumnLayout<T> {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const layout: ColumnLayout<T> = { placed: [], overflow: [] };
  const endOf = (item: T) => Math.max(item.end, item.start + minDuration);

  let group: { item: T; column: number }[] = [];
  let columnEnds: number[] = [];
  let groupEnd = -Infinity;

  const flush = () => {
    if (group.length === 0) return;
    const needed = columnEnds.length;
    if (needed <= maxColumns) {
      for (const { item, column } of group) layout.placed.push({ item, column, columns: needed });
    } else {
      const lastVisible = maxColumns - 1;
      const hidden: T[] = [];
      for (const { item, column } of group) {
        if (column < lastVisible) layout.placed.push({ item, column, columns: maxColumns });
        else hidden.push(item);
      }
      layout.overflow.push({
        items: hidden,
        start: Math.min(...hidden.map((item) => item.start)),
        end: Math.max(...hidden.map(endOf)),
        column: lastVisible,
        columns: maxColumns,
      });
    }
    group = [];
    columnEnds = [];
    groupEnd = -Infinity;
  };

  for (const item of sorted) {
    if (item.start >= groupEnd) flush();
    let column = columnEnds.findIndex((end) => end <= item.start);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(endOf(item));
    } else {
      columnEnds[column] = endOf(item);
    }
    group.push({ item, column });
    groupEnd = Math.max(groupEnd, endOf(item));
  }
  flush();
  return layout;
}
