import {
  emitDbChanged,
  execute,
  listTagsFor,
  select,
  selectOne,
  setTagsFor,
  toSqlBool,
  type Tag,
} from "@/shared/db";
import { addDaysISO, nowUTC, parseDateISO, todayISO, type DateISO } from "@/shared/lib/dates";
import { newId } from "@/shared/lib/ids";
import { differenceInCalendarDays } from "date-fns";
import {
  EventRowSchema,
  compareOccurrences,
  expandOccurrences,
  shiftEvent,
  toEventData,
  type CalendarEvent,
  type EventData,
  type EventOccurrence,
  type EventPatch,
  type NewEvent,
} from "./model";

const COLUMNS =
  "id, title, description, all_day, date, start_at, end_at, tz, color, recurrence, " +
  "recurrence_until, location, is_past_log, created_at, updated_at";

/** Longest span we look back for a timed event that started before the range and runs into it. */
const LOOKBACK_DAYS = 31;

export interface RangeOptions {
  /** Reference "today" for the series horizon (defaults to the real today). */
  today?: DateISO;
}

export function getEvent(id: string): Promise<CalendarEvent | null> {
  return selectOne(`SELECT ${COLUMNS} FROM event WHERE id = ?`, [id], EventRowSchema);
}

async function requireEvent(id: string): Promise<CalendarEvent> {
  const event = await getEvent(id);
  if (!event) throw new Error(`Event not found: ${id}`);
  return event;
}

function dataParams(data: EventData) {
  return [
    data.title,
    data.description,
    toSqlBool(data.allDay),
    data.date,
    data.startAt,
    data.endAt,
    data.tz,
    data.color,
    data.recurrence,
    data.recurrenceUntil,
    data.location,
    toSqlBool(data.isPastLog),
  ];
}

export async function createEvent(input: NewEvent, today: DateISO = todayISO()) {
  const data = toEventData(input, today);
  const now = nowUTC();
  const event: CalendarEvent = { id: newId(), ...data, createdAt: now, updatedAt: now };
  await execute(
    `INSERT INTO event (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [event.id, ...dataParams(data), now, now],
  );
  emitDbChanged("event");
  return event;
}

async function writeEvent(current: CalendarEvent, data: EventData): Promise<CalendarEvent> {
  const updatedAt = nowUTC();
  await execute(
    `UPDATE event SET title = ?, description = ?, all_day = ?, date = ?, start_at = ?, end_at = ?,
       tz = ?, color = ?, recurrence = ?, recurrence_until = ?, location = ?, is_past_log = ?,
       updated_at = ? WHERE id = ?`,
    [...dataParams(data), updatedAt, current.id],
  );
  emitDbChanged("event");
  return { ...current, ...data, updatedAt };
}

/** Edits the whole series (single-occurrence edits are not supported in v1). */
export async function updateEvent(
  id: string,
  patch: EventPatch,
  today: DateISO = todayISO(),
): Promise<CalendarEvent> {
  const current = await requireEvent(id);
  return writeEvent(current, toEventData({ ...current, ...patch }, today));
}

/** Deletes the event; for a series, all repetitions. */
export async function deleteEvent(id: string): Promise<void> {
  await execute("DELETE FROM event WHERE id = ?", [id]);
  emitDbChanged("event");
}

/**
 * Moves the whole series so that the occurrence on `fromDate` (default: the series start) lands
 * on `newDate`. Times, duration and the series end shift by the same number of days.
 */
export async function moveEvent(
  id: string,
  newDate: DateISO,
  fromDate?: DateISO,
): Promise<CalendarEvent> {
  const current = await requireEvent(id);
  const days = differenceInCalendarDays(
    parseDateISO(newDate),
    parseDateISO(fromDate ?? current.date),
  );
  if (days === 0) return current;
  return writeEvent(current, shiftEvent(current, days));
}

/** Every occurrence overlapping `[from, to]` (inclusive days), recurrences expanded, sorted. */
export async function listEventsInRange(
  from: DateISO,
  to: DateISO,
  options: RangeOptions = {},
): Promise<EventOccurrence[]> {
  const today = options.today ?? todayISO();
  const lookback = addDaysISO(from, -LOOKBACK_DAYS);
  const events = await select(
    `SELECT ${COLUMNS} FROM event WHERE date <= ? AND (
       (recurrence = 'none' AND date >= ?) OR
       (recurrence <> 'none' AND (recurrence_until IS NULL OR recurrence_until >= ?)))`,
    [to, lookback, lookback],
    EventRowSchema,
  );
  return events
    .flatMap((event) => expandOccurrences(event, from, to, today))
    .sort(compareOccurrences);
}

export function listEventsForDate(date: DateISO, options: RangeOptions = {}) {
  return listEventsInRange(date, date, options);
}

/** Past events registered after they happened. */
export function listPastLogs(from: DateISO, to: DateISO, options: RangeOptions = {}) {
  return listEventsInRange(from, to, options).then((all) => all.filter((e) => e.isPastLog));
}

export function listEventTags(eventId: string): Promise<Tag[]> {
  return listTagsFor("event", eventId);
}

export function setEventTags(eventId: string, tagIds: string[]): Promise<void> {
  return setTagsFor("event", eventId, tagIds);
}
