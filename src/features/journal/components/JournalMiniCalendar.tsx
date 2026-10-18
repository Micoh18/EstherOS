import { useMemo } from "react";
import { parseDateISO, parseYearMonth, toDateISO, toYearMonth } from "@/shared/lib/dates";
import { MonthGrid } from "@/shared/ui";
import { t } from "@/shared/i18n";
import { openJournalDate, useJournalDayMoods, useWeekStartsOn } from "../hooks";
import { setVisibleMonth, useJournalStore } from "../store";
import { MoodDot } from "./MoodDot";

// TODO(A7): reemplazar por MiniCalendar de calendar si A5 lo exporta (hoy usa MonthGrid de shared/ui).
/** Month grid with a dot on each day that has entries, colored by the day's mood. */
export function JournalMiniCalendar() {
  const visibleMonth = useJournalStore((state) => state.visibleMonth);
  const activeDate = useJournalStore((state) => state.active?.date ?? null);
  const weekStartsOn = useWeekStartsOn();
  const { data: days } = useJournalDayMoods(visibleMonth);
  const byDate = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);

  return (
    <nav aria-label={t("journal.calendar.label")}>
      <MonthGrid
        month={parseYearMonth(visibleMonth)}
        onMonthChange={(month) => setVisibleMonth(toYearMonth(month))}
        selected={activeDate ? parseDateISO(activeDate) : null}
        onSelect={(day) => void openJournalDate(toDateISO(day))}
        weekStartsOn={weekStartsOn}
        renderDay={(day) => {
          const info = byDate.get(toDateISO(day));
          return info ? <MoodDot mood={info.mood} /> : null;
        }}
      />
    </nav>
  );
}
