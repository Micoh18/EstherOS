import { format, getHours } from "date-fns";
import { es } from "date-fns/locale";
import { parseDateISO, type DateISO } from "@/shared/lib/dates";
export { msUntilNextMidnight } from "@/shared/lib";
import { t } from "@/shared/i18n";

export type DayPeriod = "morning" | "afternoon" | "evening";

/** Días from 05:00, tardes from 12:00, noches from 20:00 until 04:59. */
export function dayPeriod(now: Date): DayPeriod {
  const hour = getHours(now);
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 20) return "afternoon";
  return "evening";
}

/** "Buenos días, Ana ♡", or without the name when it is not set. */
export function greeting(now: Date, name: string): string {
  const text = t(`today.greeting.${dayPeriod(now)}`);
  const trimmed = name.trim();
  return trimmed
    ? t("today.greeting.withName", { greeting: text, name: trimmed })
    : t("today.greeting.noName", { greeting: text });
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase("es") + text.slice(1);
}

/** "Domingo, 18 de octubre de 2026". */
export function formatTodayDate(day: DateISO): string {
  return capitalize(format(parseDateISO(day), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }));
}

/** "Lunes 19 de octubre". */
export function formatShortDate(day: DateISO): string {
  return capitalize(format(parseDateISO(day), "EEEE d 'de' MMMM", { locale: es }));
}
