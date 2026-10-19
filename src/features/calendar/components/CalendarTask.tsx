import type { CSSProperties } from "react";
import { setHours, setMinutes, startOfDay } from "date-fns";
import { CircleCheck } from "lucide-react";
import { useNavigate } from "react-router";
import { t } from "@/shared/i18n";
import { cn } from "@/shared/ui";
import { todoTaskPath, type Task } from "@/features/todo";
import { formatClock, type TimeFormat } from "../format";

/** Length of a timed task block in the week and day grids. */
export const TASK_BLOCK_MINUTES = 30;

interface CalendarTaskProps {
  task: Task;
  /** `block`: positioned in the hour grid (timed tasks). `pill`: all-day row (date-only tasks). */
  variant: "block" | "pill";
  timeFormat: TimeFormat;
  style?: CSSProperties;
}

function formatDueTime(dueTime: string, timeFormat: TimeFormat): string {
  const [hours, minutes] = dueTime.split(":").map(Number);
  return formatClock(setMinutes(setHours(startOfDay(new Date()), hours), minutes), timeFormat);
}

/**
 * Read-only task in the week and day views: outlined, no fill, with a check icon. Clicking it
 * opens the task in the to-do screen. `data-event-block` keeps clicks from creating events.
 */
export function CalendarTask({ task, variant, timeFormat, style }: CalendarTaskProps) {
  const navigate = useNavigate();
  const done = task.status === "done";
  const label = t(done ? "calendar.task.done" : "calendar.task.label", { title: task.title });
  const time = task.dueTime ? formatDueTime(task.dueTime, timeFormat) : null;

  return (
    <button
      type="button"
      data-event-block=""
      data-task-block={task.id}
      aria-label={time ? `${label} · ${time}` : label}
      title={time ? `${label} · ${time}` : label}
      onClick={() => navigate(todoTaskPath(task.id))}
      style={style}
      className={cn(
        "flex min-w-0 items-center gap-1 overflow-hidden rounded-sm border border-dashed border-accent px-1.5 text-left text-xs text-text",
        "bg-surface/80 outline-none hover:bg-surface-hover focus-visible:shadow-(--shadow-glow)",
        variant === "block" ? "absolute z-[5]" : "h-[22px] w-full",
        done && "text-text-muted",
      )}
    >
      <CircleCheck
        aria-hidden
        className={cn("size-3 shrink-0", done ? "text-success" : "text-accent")}
      />
      <span className={cn("truncate", done && "line-through")}>{task.title}</span>
    </button>
  );
}
