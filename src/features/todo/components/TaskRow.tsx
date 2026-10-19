import {
  useEffect,
  useId,
  useRef,
  type FocusEvent,
  type HTMLAttributes,
  type MouseEvent,
} from "react";
import { ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import type { Tag } from "@/shared/db";
import { useEscapeClose } from "@/shared/hotkeys";
import { t } from "@/shared/i18n";
import { Button, Checkbox, Chip, cn } from "@/shared/ui";
import { confirmDeleteTask, toggleTaskDone, useSubtasks, useToday } from "../hooks";
import type { Task, TodoList } from "../model";
import { useTodoStore } from "../store";
import { DueChip, ListChip, PriorityFlag } from "./TaskBadges";

export interface TaskRowProps {
  task: Task;
  /** Minimal row (checkbox, title, date, priority) for other screens such as Hoy. */
  compact?: boolean;
  /** Shows the list chip (smart views). */
  list?: TodoList | null;
  progress?: { done: number; total: number };
  tags?: Tag[];
  /** Props of the drag handle (dnd-kit attributes and listeners); no handle when absent. */
  dragHandleProps?: HTMLAttributes<HTMLElement>;
  /** Compact rows: called when the title is clicked. */
  onOpen?: (task: Task) => void;
  className?: string;
}

const focusRing = "outline-none focus-visible:shadow-(--shadow-glow)";

/** One task: round checkbox, title and its date, priority, subtask and tag badges. */
export function TaskRow({
  task,
  compact = false,
  list,
  progress,
  tags,
  dragHandleProps,
  onOpen,
  className,
}: TaskRowProps) {
  const today = useToday();
  const completing = useTodoStore((state) => Boolean(state.completing[task.id]));
  const selected = useTodoStore((state) => !compact && state.selectedTaskId === task.id);
  const expanded = useTodoStore((state) => !compact && Boolean(state.expanded[task.id]));
  const confirming = useTodoStore((state) => !compact && state.confirmDeleteId === task.id);
  const pendingFocus = useTodoStore((state) => !compact && state.pendingFocusId === task.id);
  const rowRef = useRef<HTMLDivElement>(null);
  const subtasksId = useId();
  const done = task.status === "done" || completing;

  // Moving rows in the DOM drops focus: restore it once the reordered data arrives.
  useEffect(() => {
    if (pendingFocus && document.activeElement !== rowRef.current) rowRef.current?.focus();
  }, [pendingFocus, task.sortOrder]);

  const store = useTodoStore.getState;
  const handleFocus = () => {
    if (!compact) store().setFocusedTask(task.id);
  };
  const handleBlur = (event: FocusEvent) => {
    if (compact || rowRef.current?.contains(event.relatedTarget as Node | null)) return;
    if (store().focusedTaskId === task.id) store().setFocusedTask(null);
  };
  const handleClick = (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest("button, input, a")) return;
    if (compact) onOpen?.(task);
    else store().openDetail(task.id);
  };

  const hasSubtasks = !compact && progress !== undefined && progress.total > 0;

  return (
    <div className={className}>
      <div
        ref={rowRef}
        data-task-row={compact ? undefined : task.id}
        tabIndex={compact ? undefined : 0}
        role={compact ? undefined : "group"}
        aria-label={compact ? undefined : task.title}
        aria-current={selected || undefined}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={handleClick}
        className={cn(
          "group flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2",
          "transition-[background-color,box-shadow] duration-(--dur-fast) ease-(--ease-soft)",
          !compact && "cursor-pointer hover:bg-surface-hover",
          compact && onOpen && "cursor-pointer",
          selected && "bg-surface-hover",
          focusRing,
        )}
      >
        {dragHandleProps ? (
          <span
            {...dragHandleProps}
            tabIndex={-1}
            // Pointer only: the keyboard reorders with the row shortcuts.
            aria-hidden
            className="-ml-2 flex cursor-grab touch-none items-center text-text-faint opacity-0 group-hover:opacity-100 active:cursor-grabbing"
          >
            <GripVertical aria-hidden className="size-4" />
          </span>
        ) : null}
        <Checkbox
          checked={done}
          size={compact ? "sm" : "md"}
          aria-label={t(done ? "todo.row.reopen" : "todo.row.complete", { title: task.title })}
          onCheckedChange={() => void toggleTaskDone(task)}
        />
        {compact && onOpen ? (
          <button
            type="button"
            onClick={() => onOpen(task)}
            className={cn(
              "min-w-0 flex-1 truncate rounded-sm text-left transition-colors duration-(--dur-base)",
              done ? "text-text-faint line-through" : "text-text",
              focusRing,
            )}
          >
            {task.title}
          </button>
        ) : (
          <span
            className={cn(
              "min-w-0 flex-1 truncate transition-colors duration-(--dur-base)",
              done ? "text-text-faint line-through" : "text-text",
            )}
          >
            {task.title}
          </span>
        )}

        {confirming ? (
          <DeleteConfirm task={task} />
        ) : (
          <span className="flex shrink-0 items-center gap-2">
            {hasSubtasks ? (
              <button
                type="button"
                onClick={() => store().toggleExpanded(task.id)}
                aria-expanded={expanded}
                aria-controls={expanded ? subtasksId : undefined}
                aria-label={t(expanded ? "todo.row.collapseProgress" : "todo.row.expandProgress", {
                  done: progress.done,
                  total: progress.total,
                })}
                className={cn(
                  "relative inline-flex h-[22px] items-center gap-0.5 rounded-full px-1.5 text-xs font-semibold text-text-muted hover:bg-bg-elevated",
                  // Invisible 32px tall hit area around the small pill.
                  "before:absolute before:inset-x-0 before:-inset-y-[5px] before:content-['']",
                  focusRing,
                )}
              >
                {expanded ? (
                  <ChevronDown aria-hidden className="size-3.5" />
                ) : (
                  <ChevronRight aria-hidden className="size-3.5" />
                )}
                {t("todo.row.subtasks", { done: progress.done, total: progress.total })}
              </button>
            ) : null}
            {!compact &&
              tags?.map((tag) => (
                <Chip key={tag.id} size="sm" color={tag.color ?? "neutral"}>
                  {tag.name}
                </Chip>
              ))}
            {list ? <ListChip list={list} /> : null}
            {task.dueDate ? (
              <DueChip dueDate={task.dueDate} dueTime={task.dueTime} today={today} done={done} />
            ) : null}
            <PriorityFlag priority={task.priority} />
          </span>
        )}
      </div>
      {expanded ? <InlineSubtasks id={subtasksId} parentId={task.id} /> : null}
    </div>
  );
}

function DeleteConfirm({ task }: { task: Task }) {
  const ref = useRef<HTMLSpanElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancel = () => useTodoStore.getState().setConfirmDelete(null);
  useEscapeClose(ref, cancel);
  useEffect(() => confirmRef.current?.focus(), []);

  return (
    <span ref={ref} data-escape-close className="flex shrink-0 items-center gap-2">
      <span className="text-sm text-text-muted">
        {t("todo.row.confirmDelete", { title: task.title })}
      </span>
      <Button
        ref={confirmRef}
        size="sm"
        variant="danger"
        onClick={() => void confirmDeleteTask(task.id)}
      >
        {t("todo.action.delete")}
      </Button>
      <Button size="sm" variant="ghost" onClick={cancel}>
        {t("todo.action.cancel")}
      </Button>
    </span>
  );
}

function InlineSubtasks({ id, parentId }: { id: string; parentId: string }) {
  const subtasks = useSubtasks(parentId);
  return (
    <ul id={id} className="mb-1 ml-[46px] flex flex-col gap-0.5 border-l border-border pl-3">
      {subtasks.map((sub) => (
        <li key={sub.id} className="flex min-h-[32px] items-center gap-2">
          <Checkbox
            size="sm"
            particles={false}
            checked={sub.status === "done"}
            aria-label={t(sub.status === "done" ? "todo.row.reopen" : "todo.row.complete", {
              title: sub.title,
            })}
            onCheckedChange={() => void toggleTaskDone(sub)}
          />
          <span
            className={cn(
              "truncate text-sm",
              sub.status === "done" ? "text-text-faint line-through" : "text-text",
            )}
          >
            {sub.title}
          </span>
        </li>
      ))}
    </ul>
  );
}
