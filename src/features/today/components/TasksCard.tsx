import { useNavigate } from "react-router";
import { ListTodo } from "lucide-react";
import { Heart } from "@/shared/icons";
import { t } from "@/shared/i18n";
import type { DateISO } from "@/shared/lib/dates";
import { Button, EmptyState } from "@/shared/ui";
import {
  QuickAdd,
  TaskRow,
  todoTaskPath,
  todoViewPath,
  useCompletingTasks,
  useOverdueTasks,
  useTasksForDate,
  type Task,
} from "@/features/todo";
import { CardError, CardLoading, TodayCard } from "./TodayCard";

interface TasksCardProps {
  today: DateISO;
  /** Each change focuses the quick capture (shortcut `today.newTask`). */
  quickAddFocus: number;
  className?: string;
}

/**
 * Overdue tasks plus the ones that just got completed, which stay in place (checked) during the
 * completion animation even though the overdue query only returns open tasks.
 */
function withCompleting(overdue: Task[], completing: Record<string, Task>, today: DateISO) {
  const ids = new Set(overdue.map((task) => task.id));
  const extra = Object.values(completing).filter(
    (task) =>
      !ids.has(task.id) && task.parentId === null && task.dueDate !== null && task.dueDate < today,
  );
  return [...overdue, ...extra].sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
}

/** "Pendientes de hoy": overdue section, today's tasks with a working checkbox, quick capture. */
export function TasksCard({ today, quickAddFocus, className }: TasksCardProps) {
  const navigate = useNavigate();
  const completing = useCompletingTasks();
  const overdueQuery = useOverdueTasks(today);
  const dueTodayQuery = useTasksForDate(today);
  const overdue = withCompleting(
    overdueQuery.data.filter((task) => task.parentId === null),
    completing,
    today,
  );
  // Same scope as the Hoy view of Tareas: top-level tasks (subtasks live inside their parent).
  const dueToday = dueTodayQuery.data.filter((task) => task.parentId === null);
  const open = (task: Task) => navigate(todoTaskPath(task.id));
  const failed = Boolean(overdueQuery.error || dueTodayQuery.error);
  const loading = overdueQuery.loading || dueTodayQuery.loading;
  const empty = !failed && !loading && overdue.length === 0 && dueToday.length === 0;

  return (
    <TodayCard
      title={t("today.tasks.title")}
      icon={<ListTodo />}
      className={className}
      footer={
        <Button size="sm" variant="ghost" onClick={() => navigate(todoViewPath("today"))}>
          {t("today.tasks.open")}
        </Button>
      }
    >
      {failed ? <CardError message={t("today.tasks.error")} /> : null}
      {loading && !failed ? <CardLoading rows={3} /> : null}

      {!loading && overdue.length > 0 ? (
        <section
          aria-label={t("today.tasks.overdue")}
          className="flex flex-col gap-0.5 rounded-md bg-danger/10 p-1.5"
        >
          <h3 className="px-2 pt-1 text-xs font-semibold tracking-wide text-danger uppercase">
            {t("today.tasks.overdue")}
          </h3>
          <ul className="flex flex-col gap-0.5">
            {overdue.map((task) => (
              <li key={task.id}>
                <TaskRow task={task} compact onOpen={open} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!loading && dueToday.length > 0 ? (
        <ul className="flex flex-col gap-0.5">
          {dueToday.map((task) => (
            <li key={task.id}>
              <TaskRow task={task} compact onOpen={open} />
            </li>
          ))}
        </ul>
      ) : null}

      {empty ? (
        <EmptyState size="sm" icon={<Heart size={22} />} title={t("today.tasks.empty")} />
      ) : null}

      <QuickAdd
        defaultDue={today}
        focusSignal={quickAddFocus}
        placeholder={t("today.tasks.quickAdd")}
        shortcutAction="today.newTask"
        className="mt-auto"
      />
    </TodayCard>
  );
}
