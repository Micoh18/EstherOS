import { BookHeart, CircleCheck, Circle, ListTodo, Plus } from "lucide-react";
import { useNavigate } from "react-router";
import type { DateISO } from "@/shared/lib/dates";
import { t } from "@/shared/i18n";
import { Button, Chip, cn, EmptyState, Skeleton } from "@/shared/ui";
import type { Mood } from "@/shared/theme";
import { formatLongDate, type TimeFormat } from "../format";
import { useDaySummary } from "../hooks";
import { journalPath, todoPath } from "../routes";
import type { EventOccurrence } from "../model";
import { CalendarEvent } from "./CalendarEvent";

const MOOD_DOT: Record<Mood, string> = {
  great: "bg-mood-great",
  good: "bg-mood-good",
  okay: "bg-mood-okay",
  low: "bg-mood-low",
  bad: "bg-mood-bad",
};

interface DayPanelProps {
  day: DateISO | null;
  events: EventOccurrence[];
  eventsLoading: boolean;
  timeFormat: TimeFormat;
  onCreate: (day: DateISO) => void;
  className?: string;
}

/** Detail of the selected day: events, journal mood, tasks due and links to both features. */
export function DayPanel({
  day,
  events,
  eventsLoading,
  timeFormat,
  onCreate,
  className,
}: DayPanelProps) {
  return (
    <aside
      aria-label={t("calendar.panel.label")}
      className={cn("flex min-h-0 flex-col gap-5 overflow-y-auto p-5", className)}
    >
      {day ? (
        <DayDetail
          day={day}
          events={events}
          eventsLoading={eventsLoading}
          timeFormat={timeFormat}
          onCreate={onCreate}
        />
      ) : (
        <p className="pt-6 text-center text-sm text-text-muted">
          {t("calendar.panel.noSelection")}
        </p>
      )}
    </aside>
  );
}

function DayDetail({
  day,
  events,
  eventsLoading,
  timeFormat,
  onCreate,
}: Omit<DayPanelProps, "day" | "className"> & { day: DateISO }) {
  const navigate = useNavigate();
  const summary = useDaySummary(day);
  const tasks = summary.data?.tasks ?? [];
  const journal = summary.data?.journal ?? [];
  // Entries come oldest first: the latest mood of the day wins.
  const mood = [...journal].reverse().find((entry) => entry.mood !== null)?.mood ?? null;
  const loading = eventsLoading || summary.loading;
  const failed = Boolean(summary.error);
  const isFree =
    !loading && !failed && events.length === 0 && tasks.length === 0 && journal.length === 0;

  return (
    <>
      <header className="flex items-start justify-between gap-2">
        <h2 className="font-display text-xl font-semibold">{formatLongDate(day)}</h2>
        <Button
          size="sm"
          variant="soft"
          onClick={() => onCreate(day)}
          aria-label={t("calendar.panel.create")}
        >
          <Plus aria-hidden />
        </Button>
      </header>

      {failed ? (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {t("calendar.panel.error")}
        </p>
      ) : null}

      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-[40px]! rounded-md!" />
          <Skeleton className="h-[40px]! rounded-md!" />
        </div>
      ) : isFree ? (
        <EmptyState
          size="sm"
          title={t("calendar.panel.free")}
          description={t("calendar.panel.freeHint")}
          action={
            <Button size="sm" onClick={() => onCreate(day)}>
              <Plus aria-hidden />
              {t("calendar.panel.create")}
            </Button>
          }
        />
      ) : (
        <>
          {events.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold tracking-wide text-text-muted uppercase">
                {t("calendar.panel.events")}
              </h3>
              <div className="flex flex-col gap-1.5">
                {events.map((occurrence) => (
                  <CalendarEvent
                    key={occurrence.key}
                    occurrence={occurrence}
                    day={day}
                    timeFormat={timeFormat}
                    variant="row"
                  />
                ))}
              </div>
            </section>
          ) : null}

          {journal.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold tracking-wide text-text-muted uppercase">
                {t("calendar.panel.journal")}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                {mood ? (
                  <Chip
                    color="neutral"
                    icon={<span className={cn("size-[8px] rounded-full", MOOD_DOT[mood])} />}
                  >
                    {t(`calendar.mood.${mood}`)}
                  </Chip>
                ) : null}
                <span className="text-sm text-text-muted">
                  {journal.length === 1
                    ? t("calendar.panel.journalWritten")
                    : t("calendar.panel.journalEntries", { count: journal.length })}
                </span>
              </div>
            </section>
          ) : null}

          {tasks.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold tracking-wide text-text-muted uppercase">
                {t("calendar.panel.tasks")}
              </h3>
              <ul className="flex flex-col gap-1">
                {tasks.map((task) => {
                  const done = task.status === "done";
                  return (
                    <li
                      key={task.id}
                      className="flex items-center gap-2 rounded-md px-2 py-1 text-sm [&_svg]:size-4 [&_svg]:shrink-0"
                    >
                      {done ? (
                        <CircleCheck
                          aria-label={t("calendar.panel.taskDone")}
                          className="text-success"
                        />
                      ) : (
                        <Circle aria-hidden className="text-text-faint" />
                      )}
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate",
                          done && "text-text-muted line-through",
                        )}
                      >
                        {task.title}
                      </span>
                      {task.dueTime ? (
                        <span className="font-mono text-xs text-text-muted">{task.dueTime}</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </>
      )}

      <footer className="mt-auto flex flex-wrap gap-2 border-t border-border pt-4">
        <Button size="sm" variant="soft" onClick={() => navigate(journalPath(day))}>
          <BookHeart aria-hidden />
          {t("calendar.panel.openJournal")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => navigate(todoPath(day))}>
          <ListTodo aria-hidden />
          {t("calendar.panel.viewTasks")}
        </Button>
      </footer>
    </>
  );
}
