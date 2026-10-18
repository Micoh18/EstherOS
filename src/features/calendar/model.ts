import {
  addDays,
  addHours,
  addMinutes,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarYears,
  differenceInMinutes,
  getDaysInMonth,
  setDate,
  startOfMonth,
} from "date-fns";
import { z } from "zod";
import {
  colorKeySchema,
  dateISOSchema,
  localDateTimeSchema,
  optionalText,
  sqlBool,
  utcTimestampSchema,
} from "@/shared/db";
import {
  datePart,
  parseDateISO,
  parseLocalDateTime,
  systemTimeZone,
  toDateISO,
  toLocalDateTimeISO,
  type DateISO,
} from "@/shared/lib/dates";

export const RECURRENCES = ["none", "daily", "weekly", "monthly", "yearly"] as const;
export const RecurrenceSchema = z.enum(RECURRENCES);
export type Recurrence = z.infer<typeof RecurrenceSchema>;

/** Series without `recurrence_until` are expanded at most this far past today. */
export const RECURRENCE_HORIZON_YEARS = 2;

const eventFields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().max(10_000).nullable(),
  allDay: z.boolean(),
  /** All-day: the day. Timed: derived from `startAt` (kept for date indexes). */
  date: dateISOSchema,
  startAt: localDateTimeSchema.nullable(),
  endAt: localDateTimeSchema.nullable(),
  tz: z.string().nullable(),
  color: colorKeySchema.nullable(),
  recurrence: RecurrenceSchema,
  recurrenceUntil: dateISOSchema.nullable(),
  location: z.string().max(500).nullable(),
  isPastLog: z.boolean(),
};

type EventShape = {
  allDay: boolean;
  date?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  recurrenceUntil?: string | null;
};

/** Business rules shared by the entity and the create input. */
function checkEventRules(event: EventShape, ctx: z.RefinementCtx) {
  if (event.allDay && !event.date) {
    ctx.addIssue({ code: "custom", message: "All-day events need a date", path: ["date"] });
  }
  if (!event.allDay) {
    if (!event.startAt || !event.endAt) {
      ctx.addIssue({
        code: "custom",
        message: "Timed events need start and end",
        path: ["startAt"],
      });
    } else if (event.endAt < event.startAt) {
      ctx.addIssue({ code: "custom", message: "endAt must be >= startAt", path: ["endAt"] });
    }
  }
  const start = event.allDay ? event.date : event.startAt?.slice(0, 10);
  if (event.recurrenceUntil && start && event.recurrenceUntil < start) {
    ctx.addIssue({
      code: "custom",
      message: "recurrenceUntil must be on or after the start date",
      path: ["recurrenceUntil"],
    });
  }
}

export const EventSchema = z
  .object({
    id: z.string(),
    ...eventFields,
    createdAt: utcTimestampSchema,
    updatedAt: utcTimestampSchema,
  })
  .superRefine(checkEventRules);
export type CalendarEvent = z.infer<typeof EventSchema>;

export const EventRowSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    all_day: sqlBool,
    date: z.string().nullable(),
    start_at: z.string().nullable(),
    end_at: z.string().nullable(),
    tz: z.string().nullable(),
    color: colorKeySchema.nullable().catch(null),
    recurrence: z.string(),
    recurrence_until: z.string().nullable(),
    location: z.string().nullable(),
    is_past_log: sqlBool,
    created_at: z.string(),
    updated_at: z.string(),
  })
  .transform((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    allDay: row.all_day,
    date: row.date ?? (row.start_at ? datePart(row.start_at) : null),
    startAt: row.start_at,
    endAt: row.end_at,
    tz: row.tz,
    color: row.color,
    recurrence: row.recurrence,
    recurrenceUntil: row.recurrence_until,
    location: row.location,
    isPastLog: row.is_past_log,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
  .pipe(EventSchema);

export const NewEventSchema = z
  .object({
    title: eventFields.title,
    description: optionalText(10_000),
    allDay: z.boolean().default(true),
    date: dateISOSchema.nullish(),
    startAt: localDateTimeSchema.nullish(),
    endAt: localDateTimeSchema.nullish(),
    tz: z.string().nullish(),
    color: colorKeySchema.nullish(),
    recurrence: RecurrenceSchema.default("none"),
    recurrenceUntil: dateISOSchema.nullish(),
    location: optionalText(500),
    /** When omitted it defaults to "the event date is before today". */
    isPastLog: z.boolean().optional(),
  })
  .superRefine(checkEventRules);
export type NewEvent = z.input<typeof NewEventSchema>;
export type EventPatch = Partial<NewEvent>;

/** Event fields as stored, ready to write. */
export type EventData = Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">;

// Pure rules -------------------------------------------------------------------

/**
 * Normalizes a create/update input: an end before the start becomes start + 1 h, timed events
 * get their `date` from the start, all-day events drop their times, and `isPastLog` defaults to
 * whether the event day is before `today`.
 */
export function toEventData(input: NewEvent, today: DateISO): EventData {
  const startAt = input.startAt ?? null;
  let endAt = input.endAt ?? null;
  if (input.allDay === false && startAt && endAt && endAt < startAt) {
    endAt = toLocalDateTimeISO(addHours(parseLocalDateTime(startAt), 1));
  }
  const parsed = NewEventSchema.parse({ ...input, startAt, endAt });
  const allDay = parsed.allDay;
  const date = allDay ? parsed.date! : datePart(parsed.startAt!);
  return {
    title: parsed.title,
    description: parsed.description,
    allDay,
    date,
    startAt: allDay ? null : parsed.startAt!,
    endAt: allDay ? null : parsed.endAt!,
    tz: parsed.tz ?? systemTimeZone(),
    color: parsed.color ?? null,
    recurrence: parsed.recurrence,
    recurrenceUntil: parsed.recurrence === "none" ? null : (parsed.recurrenceUntil ?? null),
    location: parsed.location,
    isPastLog: parsed.isPastLog ?? date < today,
  };
}

/** One concrete appearance of an event (the event itself, or one repetition of a series). */
export type EventOccurrence = CalendarEvent & {
  /** Day this occurrence starts on. `date`/`startAt`/`endAt` are shifted to it. */
  occurrenceDate: DateISO;
  /** Stable key for lists: `<id>:<occurrenceDate>`. */
  key: string;
  isRecurring: boolean;
};

type RepeatRule = Exclude<Recurrence, "none">;

/** First day of the n-th period of the series (the day itself for daily/weekly). */
const PERIOD_START: Record<RepeatRule, (base: Date, n: number) => Date> = {
  daily: addDays,
  weekly: addWeeks,
  monthly: (base, n) => addMonths(startOfMonth(base), n),
  yearly: (base, n) => addYears(startOfMonth(base), n),
};

/**
 * Day of the n-th repetition, or `null` when that period has no such day. Like RFC 5545 and most
 * calendars, a series on the 31st skips months without a 31st and one on Feb 29 only appears in
 * leap years; the day is never moved to the end of the month.
 */
export function nthRepetition(base: Date, rule: RepeatRule, n: number): Date | null {
  const periodStart = PERIOD_START[rule](base, n);
  if (rule === "daily" || rule === "weekly") return periodStart;
  const day = base.getDate();
  return day <= getDaysInMonth(periodStart) ? setDate(periodStart, day) : null;
}

const INDEX_OF: Record<RepeatRule, (to: Date, base: Date) => number> = {
  daily: differenceInCalendarDays,
  weekly: (to, base) => Math.floor(differenceInCalendarDays(to, base) / 7),
  monthly: differenceInCalendarMonths,
  yearly: differenceInCalendarYears,
};

const MAX_OCCURRENCES = 2000;

/**
 * Expands an event into the occurrences that overlap `[from, to]` (inclusive days). Series stop
 * at `recurrenceUntil`, or `RECURRENCE_HORIZON_YEARS` after today when there is no end.
 */
export function expandOccurrences(
  event: CalendarEvent,
  from: DateISO,
  to: DateISO,
  today: DateISO,
): EventOccurrence[] {
  const base = parseDateISO(event.date);
  const start = event.startAt ? parseLocalDateTime(event.startAt) : null;
  const duration =
    start && event.endAt ? differenceInMinutes(parseLocalDateTime(event.endAt), start) : 0;
  const spanDays =
    start && event.endAt ? differenceInCalendarDays(parseLocalDateTime(event.endAt), start) : 0;

  const occurrence = (day: Date): EventOccurrence | null => {
    const occurrenceDate = toDateISO(day);
    const lastDay = toDateISO(addDays(day, spanDays));
    if (occurrenceDate > to || lastDay < from) return null;
    let startAt: string | null = null;
    let endAt: string | null = null;
    if (start) {
      const occStart = addDays(start, differenceInCalendarDays(day, base));
      startAt = toLocalDateTimeISO(occStart);
      endAt = toLocalDateTimeISO(addMinutes(occStart, duration));
    }
    return {
      ...event,
      date: occurrenceDate,
      startAt,
      endAt,
      occurrenceDate,
      key: `${event.id}:${occurrenceDate}`,
      isRecurring: event.recurrence !== "none",
    };
  };

  if (event.recurrence === "none") {
    const single = occurrence(base);
    return single ? [single] : [];
  }

  const todayDate = parseDateISO(today);
  const horizon =
    event.recurrenceUntil ??
    toDateISO(addYears(base > todayDate ? base : todayDate, RECURRENCE_HORIZON_YEARS));
  const last = horizon < to ? horizon : to;
  const rule = event.recurrence;
  const fromDate = addDays(parseDateISO(from), -spanDays);
  let n = Math.max(0, INDEX_OF[rule](fromDate, base) - 1);

  const result: EventOccurrence[] = [];
  for (let guard = 0; guard < MAX_OCCURRENCES; guard++, n++) {
    if (toDateISO(PERIOD_START[rule](base, n)) > last) break;
    const day = nthRepetition(base, rule, n);
    if (!day || toDateISO(day) > last) continue;
    const occ = occurrence(day);
    if (occ) result.push(occ);
  }
  return result;
}

/** Calendar order: by day, all-day first, then by start time, then title. */
export function compareOccurrences(a: EventOccurrence, b: EventOccurrence): number {
  return (
    a.occurrenceDate.localeCompare(b.occurrenceDate) ||
    Number(b.allDay) - Number(a.allDay) ||
    (a.startAt ?? "").localeCompare(b.startAt ?? "") ||
    a.title.localeCompare(b.title)
  );
}

/** Shifts the whole series by `days` (dates, times and the series end). */
export function shiftEvent(event: CalendarEvent, days: number): EventData {
  const shiftDate = (value: string | null) =>
    value === null ? null : toDateISO(addDays(parseDateISO(value), days));
  const shiftDateTime = (value: string | null) =>
    value === null ? null : toLocalDateTimeISO(addDays(parseLocalDateTime(value), days));
  return {
    title: event.title,
    description: event.description,
    allDay: event.allDay,
    date: shiftDate(event.date)!,
    startAt: shiftDateTime(event.startAt),
    endAt: shiftDateTime(event.endAt),
    tz: event.tz,
    color: event.color,
    recurrence: event.recurrence,
    recurrenceUntil: shiftDate(event.recurrenceUntil),
    location: event.location,
    isPastLog: event.isPastLog,
  };
}
