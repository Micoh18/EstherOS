import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { PaletteColor } from "@/shared/theme";
import { parseDateISO, parseLocalDateTime, type DateISO } from "@/shared/lib/dates";
import { t } from "@/shared/i18n";
import type { CalendarView } from "./grid";
import type { EventOccurrence } from "./model";

export type TimeFormat = "12h" | "24h";

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function formatClock(date: Date, timeFormat: TimeFormat): string {
  return format(date, timeFormat === "12h" ? "h:mm aaa" : "HH:mm", { locale: es });
}

/** "09:30" or "9:30 a. m." for a local date-time. */
export function formatTime(localDateTime: string, timeFormat: TimeFormat): string {
  return formatClock(parseLocalDateTime(localDateTime), timeFormat);
}

/** "09:00 – 10:30" or "Día completo". */
export function formatEventTime(occurrence: EventOccurrence, timeFormat: TimeFormat): string {
  if (occurrence.allDay || !occurrence.startAt || !occurrence.endAt) return t("calendar.allDay");
  return `${formatTime(occurrence.startAt, timeFormat)} – ${formatTime(occurrence.endAt, timeFormat)}`;
}

/**
 * Header title for the visible period. The month comes from `focused`, not from the first grid
 * day, which usually belongs to the previous month.
 */
export function formatPeriodTitle(
  view: CalendarView,
  days: { from: DateISO; to: DateISO },
  focused: Date,
) {
  const from = parseDateISO(days.from);
  const to = parseDateISO(days.to);
  if (view === "day") return capitalize(format(from, "EEEE d 'de' MMMM", { locale: es }));
  if (view === "week") {
    const sameMonth = from.getMonth() === to.getMonth();
    const sameYear = from.getFullYear() === to.getFullYear();
    const start = format(from, sameMonth ? "d" : sameYear ? "d MMM" : "d MMM yyyy", { locale: es });
    return `${start} – ${format(to, "d MMM yyyy", { locale: es })}`;
  }
  return capitalize(format(focused, "LLLL yyyy", { locale: es }));
}

/** "Domingo 18 de octubre de 2026". */
export function formatLongDate(day: DateISO): string {
  return capitalize(format(parseDateISO(day), "EEEE d 'de' MMMM 'de' yyyy", { locale: es }));
}

/** Tailwind classes per palette color (static strings so Tailwind can see them). */
export const EVENT_COLOR_CLASSES: Record<PaletteColor | "none", { fill: string; edge: string }> = {
  rose: { fill: "bg-palette-rose/40", edge: "border-palette-rose" },
  lavender: { fill: "bg-palette-lavender/40", edge: "border-palette-lavender" },
  sage: { fill: "bg-palette-sage/40", edge: "border-palette-sage" },
  butter: { fill: "bg-palette-butter/45", edge: "border-palette-butter" },
  sky: { fill: "bg-palette-sky/40", edge: "border-palette-sky" },
  peach: { fill: "bg-palette-peach/40", edge: "border-palette-peach" },
  none: { fill: "bg-accent-soft", edge: "border-accent" },
};

/** Solid swatch classes (color picker and dots). */
export const SWATCH_CLASSES: Record<PaletteColor, string> = {
  rose: "bg-palette-rose",
  lavender: "bg-palette-lavender",
  sage: "bg-palette-sage",
  butter: "bg-palette-butter",
  sky: "bg-palette-sky",
  peach: "bg-palette-peach",
};

export function colorClasses(color: PaletteColor | null) {
  return EVENT_COLOR_CLASSES[color ?? "none"];
}
