import { useNavigate } from "react-router";
import { CalendarDays, Cloud, Plus } from "@/shared/icons";
import { t } from "@/shared/i18n";
import type { DateISO } from "@/shared/lib/dates";
import { Button, EmptyState, IconButton } from "@/shared/ui";
import {
  calendarPath,
  EventChip,
  useEventsForDate,
  type EventOccurrence,
} from "@/features/calendar";
import { CardError, CardLoading, TodayCard } from "./TodayCard";

/** All-day first, then by start time. */
function byStart(a: EventOccurrence, b: EventOccurrence): number {
  return Number(b.allDay) - Number(a.allDay) || (a.startAt ?? "").localeCompare(b.startAt ?? "");
}

interface CalendarCardProps {
  today: DateISO;
  timeFormat: "12h" | "24h";
}

/** "Hoy en tu calendario": today's events in order, or "Día libre". */
export function CalendarCard({ today, timeFormat }: CalendarCardProps) {
  const navigate = useNavigate();
  const { data, loading, error } = useEventsForDate(today);
  const events = [...(data ?? [])].sort(byStart);
  const openDay = () => navigate(calendarPath(today));
  const create = () => navigate(calendarPath(today, { newEvent: true }));

  return (
    <TodayCard
      title={t("today.calendar.title")}
      icon={<CalendarDays />}
      actions={
        <IconButton label={t("today.calendar.add")} size="sm" variant="soft" onClick={create}>
          <Plus />
        </IconButton>
      }
      footer={
        <Button size="sm" variant="ghost" onClick={openDay}>
          {t("today.calendar.open")}
        </Button>
      }
    >
      {error && !data ? (
        <CardError message={t("today.calendar.error")} />
      ) : loading ? (
        <CardLoading />
      ) : events.length === 0 ? (
        <EmptyState
          size="sm"
          icon={<Cloud size={22} />}
          title={t("today.calendar.free")}
          description={t("today.calendar.freeHint")}
        />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {events.map((occurrence) => (
            <li key={occurrence.key}>
              <EventChip
                occurrence={occurrence}
                variant="row"
                timeFormat={timeFormat}
                onClick={openDay}
              />
            </li>
          ))}
        </ul>
      )}
    </TodayCard>
  );
}
