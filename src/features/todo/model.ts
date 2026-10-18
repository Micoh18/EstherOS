import { z } from "zod";
import {
  colorKeySchema,
  dateISOSchema,
  optionalText,
  sqlBool,
  timeHMSchema,
  utcTimestampSchema,
} from "@/shared/db";

export const INBOX_LIST_ID = "inbox";

export const TASK_PRIORITIES = ["none", "low", "medium", "high"] as const;
export const TaskPrioritySchema = z.enum(TASK_PRIORITIES);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const TASK_STATUSES = ["open", "done"] as const;
export const TaskStatusSchema = z.enum(TASK_STATUSES);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

// Lists ----------------------------------------------------------------------

export const TodoListSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: colorKeySchema.nullable(),
  icon: z.string().nullable(),
  sortOrder: z.number().int(),
  isArchived: z.boolean(),
  createdAt: utcTimestampSchema,
  updatedAt: utcTimestampSchema,
});
export type TodoList = z.infer<typeof TodoListSchema>;

export const TodoListRowSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    color: colorKeySchema.nullable().catch(null),
    icon: z.string().nullable(),
    sort_order: z.number().int(),
    is_archived: sqlBool,
    created_at: utcTimestampSchema,
    updated_at: utcTimestampSchema,
  })
  .transform((row): TodoList => ({
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    sortOrder: row.sort_order,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

export const NewTodoListSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: colorKeySchema.nullish().transform((value) => value ?? null),
  icon: optionalText(60),
});
export type NewTodoList = z.input<typeof NewTodoListSchema>;
export type TodoListPatch = Partial<NewTodoList>;

// Tasks ----------------------------------------------------------------------

/** Field rules shared by the entity, the create input and patches. */
const taskFields = {
  listId: z.string().min(1),
  parentId: z.string().min(1).nullable(),
  title: z.string().trim().min(1).max(500),
  notes: z.string().max(10_000).nullable(),
  dueDate: dateISOSchema.nullable(),
  dueTime: timeHMSchema.nullable(),
  priority: TaskPrioritySchema,
};

/** `due_time` only makes sense together with `due_date`. */
export function dueTimeRequiresDueDate(task: {
  dueDate?: string | null;
  dueTime?: string | null;
}): boolean {
  return !task.dueTime || Boolean(task.dueDate);
}

const DUE_TIME_ISSUE = { message: "dueTime requires dueDate", path: ["dueTime"] };

export const TaskSchema = z
  .object({
    id: z.string(),
    ...taskFields,
    status: TaskStatusSchema,
    sortOrder: z.number().int(),
    completedAt: utcTimestampSchema.nullable(),
    createdAt: utcTimestampSchema,
    updatedAt: utcTimestampSchema,
  })
  .refine(dueTimeRequiresDueDate, DUE_TIME_ISSUE);
export type Task = z.infer<typeof TaskSchema>;

export const TaskRowSchema = z
  .object({
    id: z.string(),
    list_id: z.string(),
    parent_id: z.string().nullable(),
    title: z.string(),
    notes: z.string().nullable(),
    due_date: z.string().nullable(),
    due_time: z.string().nullable(),
    priority: z.string(),
    status: z.string(),
    sort_order: z.number(),
    completed_at: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .transform((row) => ({
    id: row.id,
    listId: row.list_id,
    parentId: row.parent_id,
    title: row.title,
    notes: row.notes,
    dueDate: row.due_date,
    dueTime: row.due_time,
    priority: row.priority,
    status: row.status,
    sortOrder: row.sort_order,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
  .pipe(TaskSchema);

export const NewTaskSchema = z
  .object({
    listId: taskFields.listId.default(INBOX_LIST_ID),
    parentId: taskFields.parentId.optional().default(null),
    title: taskFields.title,
    notes: optionalText(10_000),
    dueDate: taskFields.dueDate.optional().default(null),
    dueTime: taskFields.dueTime.optional().default(null),
    priority: taskFields.priority.default("none"),
  })
  .refine(dueTimeRequiresDueDate, DUE_TIME_ISSUE);
export type NewTask = z.input<typeof NewTaskSchema>;
export type NewTaskData = z.output<typeof NewTaskSchema>;

/** Editable fields. Status changes go through `toggleDone`; list changes through `move`. */
export type TaskPatch = Partial<
  Pick<NewTaskData, "title" | "notes" | "dueDate" | "dueTime" | "priority">
>;

export interface TaskFilter {
  listId?: string;
  status?: TaskStatus;
  /** Exact due date. */
  dueDate?: string;
  /** Due strictly before this date. */
  dueBefore?: string;
  /** Due strictly after this date. */
  dueAfter?: string;
  /** `null` = top-level tasks only; a string = subtasks of that task. */
  parentId?: string | null;
  /** Only tasks completed at or after this UTC timestamp. */
  completedSince?: string;
  /** Include tasks of archived lists (default false). */
  includeArchived?: boolean;
}

// Pure rules -------------------------------------------------------------------

export function isTaskDone(task: Pick<Task, "status">): boolean {
  return task.status === "done";
}

export function isOverdue(task: Pick<Task, "status" | "dueDate">, today: string): boolean {
  return task.status === "open" && task.dueDate !== null && task.dueDate < today;
}

/**
 * New sort orders for a manual reorder: positions follow `orderedIds`; tasks of the block not
 * mentioned keep their relative order after them.
 */
export function renumber(
  current: Pick<Task, "id" | "sortOrder">[],
  orderedIds: string[],
): Map<string, number> {
  const known = new Set(current.map((t) => t.id));
  const head = orderedIds.filter((id) => known.has(id));
  const headSet = new Set(head);
  const tail = [...current]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((t) => t.id)
    .filter((id) => !headSet.has(id));
  return new Map([...head, ...tail].map((id, index) => [id, index]));
}
