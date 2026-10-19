import { useNavigate } from "react-router";
import { CircleCheck } from "lucide-react";
import { t } from "@/shared/i18n";
import { addDaysISO, type DateISO } from "@/shared/lib/dates";
import { cn } from "@/shared/ui";
import { calendarPath, EventChip, useEventsForDate } from "@/features/calendar";
import { todoTaskPath, useTasksForDate } from "@/features/todo";
import { formatShortDate } from "../model";
import { CardError, CardLoading } from "./TodayCard";

interface TomorrowRowProps {
  today: DateISO;
  timeFormat: "12h" | "24h";
}

/** Bottom row: tomorrow's events and tasks as small pills. */
export function TomorrowRow({ today, timeFormat }: TomorrowRowProps) {
  const navigate = useNavigate();
  const tomorrow = addDaysISO(today, 1);
  const eventsQuery = useEventsForDate(tomorrow);
  const tasksQuery = useTasksForDate(tomorrow);
  const events = eventsQuery.data ?? [];
  const tasks = tasksQuery.data.filter((task) => task.parentId === null);
  const failed = Boolean(eventsQuery.error || tasksQuery.error);
  const loading = eventsQuery.loading || tasksQuery.loading;
  const empty = events.length === 0 && tasks.length === 0;

  return (
    <section aria-labelledby="today-tomorrow" className="flex flex-col gap-3">
      <h2 id="today-tomorrow" className="flex items-baseline gap-2 font-display text-lg">
        <span className="font-semibold">{t("today.tomorrow.title")}</span>
        <span className="text-sm text-text-muted">{formatShortDate(tomorrow)}</span>
      </h2>
      {failed ? (
        <CardError message={t("today.tomorrow.error")} />
      ) : loading && empty ? (
        <CardLoading rows={1} />
      ) : empty ? (
        <p className="text-sm text-text-muted">{t("today.tomorrow.empty")}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {events.map((occurrence) => (
            <li key={occurrence.key} className="max-w-[280px] min-w-[120px]">
              <EventChip
                occurrence={occurrence}
                timeFormat={timeFormat}
                onClick={() => navigate(calendarPath(tomorrow))}
              />
            </li>
          ))}
          {tasks.map((task) => {
            const done = task.status === "done";
            return (
              <li key={task.id} className="max-w-[280px]">
                <button
                  type="button"
                  aria-label={t("today.tomorrow.task", { title: task.title })}
                  onClick={() => navigate(todoTaskPath(task.id))}
                  className={cn(
                    "flex h-[32px] max-w-full items-center gap-1 rounded-full border border-dashed border-accent px-2 text-xs font-semibold text-text",
                    "outline-none hover:bg-surface-hover focus-visible:shadow-(--shadow-glow)",
                  )}
                >
                  <CircleCheck
                    aria-hidden
                    className={cn("size-3 shrink-0", done ? "text-success" : "text-accent")}
                  />
                  <span className={cn("truncate", done && "text-text-muted line-through")}>
                    {task.title}
                  </span>
                  {task.dueTime ? (
                    <span className="font-mono text-[10px] font-normal text-text-muted">
                      {task.dueTime}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
