import { Flag } from "lucide-react";
import { Chip, cn } from "@/shared/ui";
import { t } from "@/shared/i18n";
import type { DateISO } from "@/shared/lib/dates";
import type { TaskPriority, TodoList } from "../model";
import { describeDue } from "../views";
import { dueText, priorityLabel } from "./labels";
import { ListIcon } from "./ListIcon";

const DUE_TONE_CLASS = {
  overdue: "bg-danger/12 text-danger",
  today: "bg-accent-soft text-text",
  soon: "bg-bg-elevated text-text",
  later: "bg-bg-elevated text-text-muted",
} as const;

/** Relative due date ("Hoy", "Mañana", "Vie 24", "Hace 3 días"), plus the time when set. */
export function DueChip({
  dueDate,
  dueTime,
  today,
  done = false,
}: {
  dueDate: DateISO;
  dueTime: string | null;
  today: DateISO;
  done?: boolean;
}) {
  const tone = done ? "later" : describeDue(dueDate, today).tone;
  return (
    <span
      className={cn(
        "inline-flex h-[22px] shrink-0 items-center gap-1 rounded-full px-2 text-xs font-semibold whitespace-nowrap",
        DUE_TONE_CLASS[tone],
      )}
    >
      {dueText(dueDate, today)}
      {dueTime ? <span className="font-normal opacity-80">· {dueTime}</span> : null}
    </span>
  );
}

const PRIORITY_CLASS: Record<Exclude<TaskPriority, "none">, string> = {
  low: "text-palette-sage",
  medium: "text-palette-butter",
  high: "text-palette-rose",
};

/** Small colored flag; nothing for tasks without priority. */
export function PriorityFlag({ priority }: { priority: TaskPriority }) {
  if (priority === "none") return null;
  const label = t("todo.priority.flag", { level: priorityLabel(priority).toLowerCase() });
  return (
    <span role="img" aria-label={label} title={label} className="inline-flex shrink-0">
      <Flag aria-hidden className={cn("size-4 fill-current", PRIORITY_CLASS[priority])} />
    </span>
  );
}

/** List name with its icon and color, shown on rows of the smart views. */
export function ListChip({ list }: { list: TodoList }) {
  return (
    <Chip
      size="sm"
      color={list.color ?? "neutral"}
      icon={<ListIcon icon={list.icon} aria-hidden />}
    >
      {list.name}
    </Chip>
  );
}
