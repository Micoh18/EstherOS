import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Trash, X } from "lucide-react";
import { ensureTag } from "@/shared/db";
import { useFormattedBinding, useHotkey, useScope } from "@/shared/hotkeys";
import { t } from "@/shared/i18n";
import { log } from "@/shared/lib/log";
import { parseDateISO, toDateISO } from "@/shared/lib/dates";
import {
  Button,
  Checkbox,
  Chip,
  DatePicker,
  IconButton,
  Input,
  Select,
  Textarea,
  TimePicker,
  Tooltip,
  cn,
} from "@/shared/ui";
import {
  toggleTaskDone,
  useHourCycle,
  useSubtasks,
  useTask,
  useTaskTags,
  useWeekStartsOn,
} from "../hooks";
import { TASK_PRIORITIES, type Task, type TodoList } from "../model";
import {
  createSubtask,
  deleteTask,
  move,
  setDue,
  setPriority,
  setTaskTags,
  updateTask,
} from "../repository";
import { useTodoStore } from "../store";
import { formatTimestamp } from "../views";
import { priorityLabel } from "./labels";

const ease = [0.33, 0.9, 0.35, 1] as const;

/**
 * Local copy of a text field that is saved on blur, on Enter (single line) and when the panel
 * closes, so typing never waits for the database.
 */
function useDraft(value: string, save: (next: string) => void) {
  const [draft, setDraft] = useState(value);
  const [source, setSource] = useState(value);
  if (value !== source) {
    setSource(value);
    setDraft(value);
  }
  const latest = useRef({ draft, value, save });
  useEffect(() => {
    latest.current = { draft, value, save };
  });
  useEffect(
    () => () => {
      const { draft: pending, value: saved, save: flush } = latest.current;
      if (pending !== saved) flush(pending);
    },
    [],
  );
  const commit = () => {
    if (draft !== value) save(draft);
  };
  return [draft, setDraft, commit] as const;
}

function report(action: string) {
  return (error: unknown) => log.error(`todo: ${action} failed`, error);
}

/** Right panel (340 px) with every field of the selected task. */
export function TaskDetail({ taskId, lists }: { taskId: string; lists: TodoList[] }) {
  useScope("todo.detail");
  const { data: task, loading } = useTask(taskId);
  const reduceMotion = useReducedMotion();

  const close = () => {
    const state = useTodoStore.getState();
    state.closeDetail();
    state.requestFocus(taskId);
  };
  useHotkey("todo.closeDetail", () => {
    const state = useTodoStore.getState();
    if (state.confirmDeleteId) state.setConfirmDelete(null);
    else close();
  });

  // The task was deleted elsewhere.
  useEffect(() => {
    if (!loading && !task) useTodoStore.getState().closeDetail();
  }, [loading, task]);

  return (
    <motion.aside
      aria-label={t("todo.detail.label")}
      initial={{ opacity: 0, x: reduceMotion ? 0 : 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: reduceMotion ? 0 : 16 }}
      transition={{ duration: 0.2, ease }}
      className="flex w-[340px] shrink-0 flex-col overflow-y-auto border-l border-border bg-surface"
    >
      {task ? <DetailFields key={task.id} task={task} lists={lists} onClose={close} /> : null}
    </motion.aside>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold tracking-wide text-text-muted uppercase">{label}</span>
      {children}
    </div>
  );
}

function DetailFields({
  task,
  lists,
  onClose,
}: {
  task: Task;
  lists: TodoList[];
  onClose: () => void;
}) {
  const weekStartsOn = useWeekStartsOn();
  const hourCycle = useHourCycle();
  const closeShortcut = useFormattedBinding("todo.closeDetail");
  const done = task.status === "done";
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [title, setTitle, commitTitle] = useDraft(task.title, (next) => {
    if (next.trim()) void updateTask(task.id, { title: next.trim() }).catch(report("title"));
  });
  const [notes, setNotes, commitNotes] = useDraft(task.notes ?? "", (next) => {
    void updateTask(task.id, { notes: next.trim() ? next : null }).catch(report("notes"));
  });

  const listOptions = lists
    .filter((list) => !list.isArchived || list.id === task.listId)
    .map((list) => ({ value: list.id, label: list.name }));

  const remove = async () => {
    useTodoStore.getState().closeDetail();
    await deleteTask(task.id);
  };

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-start gap-3">
        <Checkbox
          className="mt-2.5"
          checked={done}
          aria-label={t(done ? "todo.row.reopen" : "todo.row.complete", { title: task.title })}
          onCheckedChange={() => void toggleTaskDone(task)}
        />
        <Textarea
          rows={2}
          value={title}
          maxLength={500}
          aria-label={t("todo.detail.title")}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => (title.trim() ? commitTitle() : setTitle(task.title))}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          className={cn(
            "min-h-0 flex-1 resize-none border-transparent bg-transparent px-2 py-1.5 font-display text-xl font-semibold",
            done && "text-text-faint line-through",
          )}
        />
        <Tooltip content={t("todo.detail.close")} shortcut={closeShortcut || undefined}>
          <IconButton label={t("todo.detail.close")} size="sm" onClick={onClose}>
            <X aria-hidden />
          </IconButton>
        </Tooltip>
      </div>

      {task.parentId === null ? (
        <Field label={t("todo.detail.list")}>
          <Select
            size="sm"
            aria-label={t("todo.detail.list")}
            value={task.listId}
            options={listOptions}
            onValueChange={(listId) => void move(task.id, listId).catch(report("move"))}
          />
        </Field>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("todo.detail.due")}>
          <DatePicker
            size="sm"
            aria-label={t("todo.detail.due")}
            weekStartsOn={weekStartsOn}
            value={task.dueDate ? parseDateISO(task.dueDate) : null}
            onChange={(date) =>
              void setDue(task.id, date ? toDateISO(date) : null, task.dueTime).catch(report("due"))
            }
          />
        </Field>
        <Field label={t("todo.detail.time")}>
          <div className="flex items-center gap-1">
            <TimePicker
              size="sm"
              aria-label={t("todo.detail.time")}
              hourCycle={hourCycle}
              disabled={!task.dueDate}
              value={task.dueTime}
              onChange={(time) => void setDue(task.id, task.dueDate, time).catch(report("time"))}
              className="min-w-0 flex-1"
            />
            {task.dueTime ? (
              <IconButton
                size="sm"
                label={t("todo.detail.clearTime")}
                onClick={() => void setDue(task.id, task.dueDate, null).catch(report("time"))}
              >
                <X aria-hidden />
              </IconButton>
            ) : null}
          </div>
        </Field>
      </div>

      <Field label={t("todo.detail.priority")}>
        <div className="flex flex-wrap gap-1.5">
          {[...TASK_PRIORITIES].reverse().map((priority) => (
            <Chip
              key={priority}
              size="sm"
              color={
                priority === "high"
                  ? "rose"
                  : priority === "medium"
                    ? "butter"
                    : priority === "low"
                      ? "sage"
                      : "neutral"
              }
              selected={task.priority === priority}
              onClick={() => void setPriority(task.id, priority).catch(report("priority"))}
            >
              {priorityLabel(priority)}
            </Chip>
          ))}
        </div>
      </Field>

      <TagsField taskId={task.id} />

      <Field label={t("todo.detail.notes")}>
        <Textarea
          rows={4}
          value={notes}
          maxLength={10_000}
          placeholder={t("todo.detail.notesPlaceholder")}
          aria-label={t("todo.detail.notes")}
          onChange={(event) => setNotes(event.target.value)}
          onBlur={commitNotes}
        />
      </Field>

      {task.parentId === null ? <SubtasksField task={task} /> : null}

      <div className="flex flex-col gap-0.5 text-xs text-text-faint">
        <span>{t("todo.detail.created", { date: formatTimestamp(task.createdAt) })}</span>
        {task.completedAt ? (
          <span>{t("todo.detail.completed", { date: formatTimestamp(task.completedAt) })}</span>
        ) : null}
      </div>

      {confirmingDelete ? (
        <div className="flex items-center gap-2 rounded-md bg-danger/12 p-3">
          <span className="min-w-0 flex-1 text-sm">
            {t("todo.row.confirmDelete", { title: task.title })}
          </span>
          <Button
            size="sm"
            variant="danger"
            autoFocus
            onClick={() => void remove().catch(report("delete"))}
          >
            {t("todo.action.delete")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(false)}>
            {t("todo.action.cancel")}
          </Button>
        </div>
      ) : (
        <Button
          variant="danger"
          size="sm"
          className="self-start"
          onClick={() => setConfirmingDelete(true)}
        >
          <Trash aria-hidden />
          {t("todo.detail.delete")}
        </Button>
      )}
    </div>
  );
}

function TagsField({ taskId }: { taskId: string }) {
  const tags = useTaskTags(taskId);
  const [name, setName] = useState("");

  const add = async () => {
    const value = name.trim();
    if (!value) return;
    setName("");
    const tag = await ensureTag(value);
    await setTaskTags(taskId, [...tags.map((item) => item.id), tag.id]);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void add().catch(report("tag"));
    }
  };

  return (
    <Field label={t("todo.detail.tags")}>
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Chip
              key={tag.id}
              size="sm"
              color={tag.color ?? "accent"}
              onRemove={() =>
                void setTaskTags(
                  taskId,
                  tags.filter((item) => item.id !== tag.id).map((item) => item.id),
                ).catch(report("tag"))
              }
            >
              {tag.name}
            </Chip>
          ))}
        </div>
      ) : null}
      <Input
        size="sm"
        value={name}
        maxLength={50}
        placeholder={t("todo.detail.addTag")}
        aria-label={t("todo.detail.addTag")}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={onKeyDown}
      />
    </Field>
  );
}

function SubtasksField({ task }: { task: Task }) {
  const subtasks = useSubtasks(task.id);
  const [title, setTitle] = useState("");
  const allDone = subtasks.length > 0 && subtasks.every((sub) => sub.status === "done");

  const add = async () => {
    const value = title.trim();
    if (!value) return;
    setTitle("");
    await createSubtask(task.id, { title: value });
  };

  return (
    <Field label={t("todo.detail.subtasks")}>
      {allDone && task.status === "open" ? (
        <div className="flex items-center gap-2 rounded-md bg-accent-soft px-3 py-2 text-sm">
          <span className="min-w-0 flex-1">{t("todo.detail.suggestDone")}</span>
          <Button size="sm" variant="ghost" onClick={() => void toggleTaskDone(task)}>
            {t("todo.detail.markDone")}
          </Button>
        </div>
      ) : null}
      <ul className="flex flex-col gap-0.5">
        {subtasks.map((sub) => (
          <SubtaskItem key={sub.id} subtask={sub} />
        ))}
      </ul>
      <Input
        size="sm"
        value={title}
        maxLength={500}
        placeholder={t("todo.detail.addSubtask")}
        aria-label={t("todo.detail.addSubtask")}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void add().catch(report("subtask"));
          }
        }}
      />
    </Field>
  );
}

function SubtaskItem({ subtask }: { subtask: Task }) {
  const done = subtask.status === "done";
  const [title, setTitle, commit] = useDraft(subtask.title, (next) => {
    if (next.trim()) void updateTask(subtask.id, { title: next.trim() }).catch(report("subtask"));
  });
  return (
    <li className="group flex min-h-[36px] items-center gap-2">
      <Checkbox
        size="sm"
        particles={false}
        checked={done}
        aria-label={t(done ? "todo.row.reopen" : "todo.row.complete", { title: subtask.title })}
        onCheckedChange={() => void toggleTaskDone(subtask)}
      />
      <input
        value={title}
        maxLength={500}
        aria-label={t("todo.detail.title")}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={() => (title.trim() ? commit() : setTitle(subtask.title))}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        className={cn(
          "min-w-0 flex-1 rounded-sm bg-transparent px-1 py-0.5 text-sm outline-none focus-visible:shadow-(--shadow-glow)",
          done ? "text-text-faint line-through" : "text-text",
        )}
      />
      <IconButton
        size="sm"
        label={t("todo.detail.deleteSubtask", { title: subtask.title })}
        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        onClick={() => void deleteTask(subtask.id).catch(report("subtask"))}
      >
        <X aria-hidden />
      </IconButton>
    </li>
  );
}
