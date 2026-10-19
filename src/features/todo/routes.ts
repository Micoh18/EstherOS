import { isValidDateISO, type DateISO } from "@/shared/lib/dates";
import { SMART_VIEWS, type SmartView } from "./views";

/**
 * Links into the to-do screen from other features. `/todo` reads them once on arrival and then
 * clears the query string.
 */
export const todoViewPath = (view: SmartView) => `/todo?view=${view}`;
export const todoDatePath = (date: DateISO) => `/todo?date=${date}`;
export const todoTaskPath = (taskId: string) => `/todo?task=${encodeURIComponent(taskId)}`;

export type TodoLink =
  | { kind: "task"; taskId: string }
  | { kind: "view"; view: SmartView }
  | { kind: "date"; date: DateISO };

const LINK_PARAMS = ["task", "view", "date"] as const;

/** Whether the query carries a link parameter, valid or not (it is cleared either way). */
export function hasTodoLinkParams(params: URLSearchParams): boolean {
  return LINK_PARAMS.some((name) => params.has(name));
}

/** What a `/todo?…` query asks for, or `null` when there is nothing (valid) to open. */
export function readTodoLink(params: URLSearchParams): TodoLink | null {
  const taskId = params.get("task");
  if (taskId) return { kind: "task", taskId };
  const view = params.get("view");
  if (view && (SMART_VIEWS as readonly string[]).includes(view)) {
    return { kind: "view", view: view as SmartView };
  }
  const date = params.get("date");
  if (date && isValidDateISO(date)) return { kind: "date", date };
  return null;
}

/** Smart view that shows the tasks due on `date`: Hoy (with the overdue ones) or Próximas. */
export function viewForDate(date: DateISO, today: DateISO): SmartView {
  return date > today ? "upcoming" : "today";
}
