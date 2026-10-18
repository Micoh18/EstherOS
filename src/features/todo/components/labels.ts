import { t } from "@/shared/i18n";
import type { DateISO } from "@/shared/lib/dates";
import type { TaskPriority } from "../model";
import { describeDue } from "../views";

/** "Hoy", "Mañana", "Ayer", "Hace 3 días" or a short date such as "Vie 24". */
export function dueText(dueDate: DateISO, today: DateISO): string {
  const due = describeDue(dueDate, today);
  switch (due.relative) {
    case "today":
      return t("todo.due.today");
    case "tomorrow":
      return t("todo.due.tomorrow");
    case "yesterday":
      return t("todo.due.yesterday");
    case "daysAgo":
      return t("todo.due.daysAgo", { count: due.daysAgo });
    default:
      return due.dateText;
  }
}

export function priorityLabel(priority: TaskPriority): string {
  return t(`todo.priority.${priority}`);
}
