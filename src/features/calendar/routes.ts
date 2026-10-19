import type { DateISO } from "@/shared/lib/dates";

/** Routes for "Abrir diario" / "Ver tareas"; the target screens read `?date=`. */
export const journalPath = (day: DateISO) => `/journal?date=${day}`;
export const todoPath = (day: DateISO) => `/todo?date=${day}`;

/** Query flag of `/calendar?date=…` that opens the new event dialog on that day. */
export const CALENDAR_NEW_PARAM = "new";

/** Link into the calendar on `day`, optionally starting a new all-day event there. */
export function calendarPath(day: DateISO, options: { newEvent?: boolean } = {}): string {
  return `/calendar?date=${day}${options.newEvent ? `&${CALENDAR_NEW_PARAM}=1` : ""}`;
}
