import { useState } from "react";
import { useNavigate } from "react-router";
import { useHotkey, useScope } from "@/shared/hotkeys";
import { t } from "@/shared/i18n";
import { Bow, RibbonDivider } from "@/shared/icons";
import { calendarPath } from "@/features/calendar";
import { useClock, useCurrentDay, useOpenJournal, useTodaySettings } from "../hooks";
import { formatTodayDate, greeting } from "../model";
import { CalendarCard } from "./CalendarCard";
import { JournalCard } from "./JournalCard";
import { TasksCard } from "./TasksCard";
import { TomorrowRow } from "./TomorrowRow";

function TodayHeader({ today, userName }: { today: string; userName: string }) {
  const now = useClock();
  return (
    <header className="flex items-start gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h1 className="font-display text-3xl font-semibold text-text">{greeting(now, userName)}</h1>
        <p className="font-display text-lg text-text-muted">{formatTodayDate(today)}</p>
      </div>
      <Bow size={40} className="shrink-0 text-accent" />
    </header>
  );
}

/** Home screen (route `/today`): greeting, today's calendar, tasks and journal, and tomorrow. */
export function TodayPage() {
  useScope("today");
  const navigate = useNavigate();
  const today = useCurrentDay();
  const { userName, timeFormat } = useTodaySettings();
  const [quickAddFocus, setQuickAddFocus] = useState(0);
  const openJournal = useOpenJournal(today);

  useHotkey("today.newTask", () => setQuickAddFocus((n) => n + 1));
  useHotkey("today.openJournal", openJournal);
  useHotkey("today.openCalendar", () => navigate(calendarPath(today)));

  return (
    <section
      aria-label={t("today.label")}
      className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-8 py-7"
    >
      <TodayHeader today={today} userName={userName} />
      <RibbonDivider size={18} className="text-border" />
      <div className="grid grid-cols-1 items-start gap-5 min-[1200px]:grid-cols-2">
        <CalendarCard today={today} timeFormat={timeFormat} />
        <TasksCard
          today={today}
          quickAddFocus={quickAddFocus}
          className="min-[1200px]:row-span-2"
        />
        <JournalCard today={today} />
      </div>
      <RibbonDivider size={18} className="text-border" />
      <TomorrowRow today={today} timeFormat={timeFormat} />
    </section>
  );
}
