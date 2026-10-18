import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns";

/** `YYYY-MM-DD`, local calendar day. */
export type DateISO = string;
/** `YYYY-MM-DDTHH:mm:ss`, local wall-clock time (zone stored separately). */
export type LocalDateTimeISO = string;
/** `YYYY-MM`. */
export type YearMonth = string;
/** 0 = Sunday … 6 = Saturday, same as date-fns. */
export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface DateRange {
  from: DateISO;
  to: DateISO;
}

const DATE_FORMAT = "yyyy-MM-dd";
const LOCAL_DATE_TIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ss";
const YEAR_MONTH_FORMAT = "yyyy-MM";
// Reference date for date-fns `parse`; only its missing fields are used.
const REF = new Date(2000, 0, 1);

export const DATE_ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
export const LOCAL_DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
export const TIME_HM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const YEAR_MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function toDateISO(date: Date): DateISO {
  return format(date, DATE_FORMAT);
}

export function toLocalDateTimeISO(date: Date): LocalDateTimeISO {
  return format(date, LOCAL_DATE_TIME_FORMAT);
}

export function toYearMonth(date: Date): YearMonth {
  return format(date, YEAR_MONTH_FORMAT);
}

export function todayISO(now: Date = new Date()): DateISO {
  return toDateISO(now);
}

/** Current instant as UTC ISO 8601 without milliseconds (`2026-10-18T14:28:00Z`). */
export function nowUTC(now: Date = new Date()): string {
  return now.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** Parses `YYYY-MM-DD` as local midnight. Throws on invalid input. */
export function parseDateISO(value: DateISO): Date {
  const date = DATE_ISO_RE.test(value) ? parse(value, DATE_FORMAT, REF) : new Date(NaN);
  if (!isValid(date)) throw new RangeError(`Invalid date: ${value}`);
  return date;
}

/** Parses `YYYY-MM-DDTHH:mm:ss` as local wall-clock time. Throws on invalid input. */
export function parseLocalDateTime(value: LocalDateTimeISO): Date {
  const date = LOCAL_DATE_TIME_RE.test(value)
    ? parse(value, LOCAL_DATE_TIME_FORMAT, REF)
    : new Date(NaN);
  if (!isValid(date)) throw new RangeError(`Invalid local date-time: ${value}`);
  return date;
}

/** Parses `YYYY-MM` as the first day of that month. Throws on invalid input. */
export function parseYearMonth(value: YearMonth): Date {
  const date = YEAR_MONTH_RE.test(value) ? parse(value, YEAR_MONTH_FORMAT, REF) : new Date(NaN);
  if (!isValid(date)) throw new RangeError(`Invalid year-month: ${value}`);
  return date;
}

export function isValidDateISO(value: string): boolean {
  return DATE_ISO_RE.test(value) && isValid(parse(value, DATE_FORMAT, REF));
}

export function isValidLocalDateTime(value: string): boolean {
  return LOCAL_DATE_TIME_RE.test(value) && isValid(parse(value, LOCAL_DATE_TIME_FORMAT, REF));
}

/** Date part of a local date-time. */
export function datePart(value: LocalDateTimeISO): DateISO {
  return value.slice(0, 10);
}

export function addDaysISO(value: DateISO, days: number): DateISO {
  return toDateISO(addDays(parseDateISO(value), days));
}

export function startOfWeekFor(date: Date, weekStartsOn: WeekStartsOn): Date {
  return startOfWeek(date, { weekStartsOn });
}

export function weekRange(date: Date, weekStartsOn: WeekStartsOn): DateRange {
  return {
    from: toDateISO(startOfWeek(date, { weekStartsOn })),
    to: toDateISO(endOfWeek(date, { weekStartsOn })),
  };
}

/** First and last day of the month containing `date` (or of a `YYYY-MM` string). */
export function monthRange(month: Date | YearMonth): DateRange {
  const date = typeof month === "string" ? parseYearMonth(month) : month;
  return { from: toDateISO(startOfMonth(date)), to: toDateISO(endOfMonth(date)) };
}

/** Full weeks covering the month: what a month grid shows. */
export function monthGridRange(month: Date | YearMonth, weekStartsOn: WeekStartsOn): DateRange {
  const date = typeof month === "string" ? parseYearMonth(month) : month;
  return {
    from: toDateISO(startOfWeek(startOfMonth(date), { weekStartsOn })),
    to: toDateISO(endOfWeek(endOfMonth(date), { weekStartsOn })),
  };
}

/** IANA zone of the system, e.g. `America/Bogota`. */
export function systemTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
