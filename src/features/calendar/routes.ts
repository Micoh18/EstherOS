import type { DateISO } from "@/shared/lib/dates";

/** Routes for "Abrir diario" / "Ver tareas"; the target screens read `?date=`. */
export const journalPath = (day: DateISO) => `/journal?date=${day}`;
export const todoPath = (day: DateISO) => `/todo?date=${day}`;
