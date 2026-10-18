import { z } from "zod";
import {
  emitDbChanged,
  execute,
  listTagsFor,
  placeholders,
  select,
  selectOne,
  setTagsFor,
  transaction,
  type SqlValue,
  type Tag,
} from "@/shared/db";
import { addDaysISO, nowUTC } from "@/shared/lib/dates";
import { newId } from "@/shared/lib/ids";
import {
  INBOX_LIST_ID,
  NewTaskSchema,
  NewTodoListSchema,
  TaskRowSchema,
  TaskSchema,
  TodoListRowSchema,
  renumber,
  type NewTask,
  type NewTodoList,
  type Task,
  type TaskFilter,
  type TaskPatch,
  type TaskPriority,
  type TodoList,
  type TodoListPatch,
} from "./model";

const LIST_COLUMNS = "id, name, color, icon, sort_order, is_archived, created_at, updated_at";
const TASK_COLUMNS =
  "t.id, t.list_id, t.parent_id, t.title, t.notes, t.due_date, t.due_time, t.priority, t.status, " +
  "t.sort_order, t.completed_at, t.created_at, t.updated_at";
const TASK_ORDER = "t.sort_order, t.created_at";
const MaxSchema = z.object({ max: z.number().nullable() });

// Lists ----------------------------------------------------------------------

export function listLists(options: { includeArchived?: boolean } = {}): Promise<TodoList[]> {
  const where = options.includeArchived ? "" : "WHERE is_archived = 0";
  return select(
    `SELECT ${LIST_COLUMNS} FROM todo_list ${where} ORDER BY sort_order, created_at`,
    [],
    TodoListRowSchema,
  );
}

export function getList(id: string): Promise<TodoList | null> {
  return selectOne(`SELECT ${LIST_COLUMNS} FROM todo_list WHERE id = ?`, [id], TodoListRowSchema);
}

async function requireList(id: string): Promise<TodoList> {
  const list = await getList(id);
  if (!list) throw new Error(`List not found: ${id}`);
  return list;
}

export async function createList(input: NewTodoList): Promise<TodoList> {
  const data = NewTodoListSchema.parse(input);
  const { max } = (await selectOne(
    "SELECT MAX(sort_order) AS max FROM todo_list",
    [],
    MaxSchema,
  )) ?? { max: null };
  const now = nowUTC();
  const list: TodoList = {
    id: newId(),
    ...data,
    sortOrder: (max ?? -1) + 1,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };
  await execute(`INSERT INTO todo_list (${LIST_COLUMNS}) VALUES (?, ?, ?, ?, ?, 0, ?, ?)`, [
    list.id,
    list.name,
    list.color,
    list.icon,
    list.sortOrder,
    now,
    now,
  ]);
  emitDbChanged("todo_list");
  return list;
}

/** Renames or restyles a list. Inbox can be renamed too. */
export async function updateList(id: string, patch: TodoListPatch): Promise<TodoList> {
  const current = await requireList(id);
  const data = NewTodoListSchema.parse({ ...current, ...patch });
  const updatedAt = nowUTC();
  await execute("UPDATE todo_list SET name = ?, color = ?, icon = ?, updated_at = ? WHERE id = ?", [
    data.name,
    data.color,
    data.icon,
    updatedAt,
    id,
  ]);
  emitDbChanged("todo_list");
  return { ...current, ...data, updatedAt };
}

/** Archived lists leave the sidebar and their tasks leave the smart views; nothing is deleted. */
export async function archiveList(id: string, archived = true): Promise<void> {
  if (id === INBOX_LIST_ID && archived) throw new Error("Inbox cannot be archived");
  await requireList(id);
  await execute("UPDATE todo_list SET is_archived = ?, updated_at = ? WHERE id = ?", [
    archived ? 1 : 0,
    nowUTC(),
    id,
  ]);
  emitDbChanged("todo_list");
  emitDbChanged("task");
}

/** Deletes a list, moving all its tasks (open and done) to the end of Inbox. */
export async function deleteList(id: string): Promise<void> {
  if (id === INBOX_LIST_ID) throw new Error("Inbox cannot be deleted");
  await requireList(id);
  const { max } = (await selectOne(
    "SELECT MAX(sort_order) AS max FROM task WHERE list_id = ?",
    [INBOX_LIST_ID],
    MaxSchema,
  )) ?? { max: null };
  const offset = (max ?? -1) + 1;
  const now = nowUTC();
  await transaction((tx) => {
    tx.execute(
      "UPDATE task SET list_id = ?, sort_order = sort_order + ?, updated_at = ? WHERE list_id = ?",
      [INBOX_LIST_ID, offset, now, id],
    );
    tx.execute("DELETE FROM todo_list WHERE id = ?", [id]);
  });
  emitDbChanged("task");
  emitDbChanged("todo_list");
}

export async function reorderLists(orderedIds: string[]): Promise<void> {
  const lists = await listLists({ includeArchived: true });
  const orders = renumber(lists, orderedIds);
  await transaction((tx) => {
    for (const [listId, order] of orders) {
      tx.execute("UPDATE todo_list SET sort_order = ? WHERE id = ?", [order, listId]);
    }
  });
  emitDbChanged("todo_list");
}

// Tasks ----------------------------------------------------------------------

export function getTask(id: string): Promise<Task | null> {
  return selectOne(`SELECT ${TASK_COLUMNS} FROM task t WHERE t.id = ?`, [id], TaskRowSchema);
}

async function requireTask(id: string): Promise<Task> {
  const task = await getTask(id);
  if (!task) throw new Error(`Task not found: ${id}`);
  return task;
}

async function nextSortOrder(listId: string, parentId: string | null): Promise<number> {
  const row = await selectOne(
    "SELECT MAX(sort_order) AS max FROM task WHERE list_id = ? AND parent_id IS ?",
    [listId, parentId],
    MaxSchema,
  );
  return (row?.max ?? -1) + 1;
}

export async function listTasks(filter: TaskFilter = {}): Promise<Task[]> {
  const where: string[] = [];
  const params: SqlValue[] = [];
  const add = (clause: string, ...values: SqlValue[]) => {
    where.push(clause);
    params.push(...values);
  };
  if (filter.listId !== undefined) add("t.list_id = ?", filter.listId);
  if (filter.status !== undefined) add("t.status = ?", filter.status);
  if (filter.dueDate !== undefined) add("t.due_date = ?", filter.dueDate);
  if (filter.dueBefore !== undefined) add("t.due_date < ?", filter.dueBefore);
  if (filter.dueAfter !== undefined) add("t.due_date > ?", filter.dueAfter);
  if (filter.parentId !== undefined) add("t.parent_id IS ?", filter.parentId);
  if (filter.completedSince !== undefined) add("t.completed_at >= ?", filter.completedSince);
  if (!filter.includeArchived) add("l.is_archived = 0");

  const sql =
    `SELECT ${TASK_COLUMNS} FROM task t JOIN todo_list l ON l.id = t.list_id` +
    (where.length ? ` WHERE ${where.join(" AND ")}` : "") +
    ` ORDER BY ${TASK_ORDER}`;
  return select(sql, params, TaskRowSchema);
}

const BY_DUE = (a: Task, b: Task) =>
  (a.dueDate ?? "").localeCompare(b.dueDate ?? "") ||
  (a.dueTime ?? "99:99").localeCompare(b.dueTime ?? "99:99") ||
  a.sortOrder - b.sortOrder;

/** Tasks due on `date` (open and done, open first, timed ones by time). Skips archived lists. */
export async function listTasksForDate(date: string): Promise<Task[]> {
  const tasks = await listTasks({ dueDate: date });
  return tasks.sort((a, b) => a.status.localeCompare(b.status) * -1 || BY_DUE(a, b));
}

/** Open tasks due before `today`. */
export async function listOverdue(today: string): Promise<Task[]> {
  return (await listTasks({ status: "open", dueBefore: today })).sort(BY_DUE);
}

/** Open tasks due after `today` and up to `today + days` included. */
export async function listUpcoming(today: string, days: number): Promise<Task[]> {
  const last = addDaysISO(today, days);
  const tasks = await listTasks({
    status: "open",
    dueAfter: today,
    dueBefore: addDaysISO(last, 1),
  });
  return tasks.sort(BY_DUE);
}

export function listSubtasks(parentId: string): Promise<Task[]> {
  return listTasks({ parentId, includeArchived: true });
}

export async function createTask(input: NewTask): Promise<Task> {
  const data = NewTaskSchema.parse(input);
  let listId = data.listId;
  if (data.parentId) {
    const parent = await requireTask(data.parentId);
    if (parent.parentId) throw new Error("Subtasks can only be one level deep");
    listId = parent.listId;
  } else {
    await requireList(listId);
  }
  const now = nowUTC();
  const task: Task = TaskSchema.parse({
    id: newId(),
    ...data,
    listId,
    status: "open",
    sortOrder: await nextSortOrder(listId, data.parentId),
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  });
  await execute(
    `INSERT INTO task (id, list_id, parent_id, title, notes, due_date, due_time, priority, status,
       sort_order, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      task.id,
      task.listId,
      task.parentId,
      task.title,
      task.notes,
      task.dueDate,
      task.dueTime,
      task.priority,
      task.status,
      task.sortOrder,
      task.completedAt,
      task.createdAt,
      task.updatedAt,
    ],
  );
  emitDbChanged("task");
  return task;
}

export function createSubtask(
  parentId: string,
  input: Omit<NewTask, "parentId" | "listId">,
): Promise<Task> {
  return createTask({ ...input, parentId });
}

export async function updateTask(id: string, patch: TaskPatch): Promise<Task> {
  const current = await requireTask(id);
  const next = TaskSchema.parse({ ...current, ...patch, updatedAt: nowUTC() });
  await execute(
    `UPDATE task SET title = ?, notes = ?, due_date = ?, due_time = ?, priority = ?, updated_at = ?
     WHERE id = ?`,
    [next.title, next.notes, next.dueDate, next.dueTime, next.priority, next.updatedAt, id],
  );
  emitDbChanged("task");
  return next;
}

/** Sets or clears the due date. Clearing the date also clears the time. */
export function setDue(id: string, dueDate: string | null, dueTime: string | null = null) {
  return updateTask(id, { dueDate, dueTime: dueDate ? dueTime : null });
}

export function setPriority(id: string, priority: TaskPriority): Promise<Task> {
  return updateTask(id, { priority });
}

/** Deletes a task and its subtasks. */
export async function deleteTask(id: string): Promise<void> {
  await transaction((tx) => {
    tx.execute("DELETE FROM task WHERE parent_id = ?", [id]);
    tx.execute("DELETE FROM task WHERE id = ?", [id]);
  });
  emitDbChanged("task");
}

/**
 * Open → done (sets `completed_at` and completes open subtasks of a parent).
 * Done → open (clears `completed_at`; subtasks stay as they are).
 */
export async function toggleDone(id: string): Promise<Task> {
  const task = await requireTask(id);
  const now = nowUTC();
  if (task.status === "open") {
    await transaction((tx) => {
      tx.execute("UPDATE task SET status = 'done', completed_at = ?, updated_at = ? WHERE id = ?", [
        now,
        now,
        id,
      ]);
      tx.execute(
        `UPDATE task SET status = 'done', completed_at = ?, updated_at = ?
         WHERE parent_id = ? AND status = 'open'`,
        [now, now, id],
      );
    });
  } else {
    await execute(
      "UPDATE task SET status = 'open', completed_at = NULL, updated_at = ? WHERE id = ?",
      [now, id],
    );
  }
  emitDbChanged("task");
  return requireTask(id);
}

/** Manual order inside a list (top-level tasks, or the subtasks of `parentId`). */
export async function reorder(
  listId: string,
  orderedIds: string[],
  parentId: string | null = null,
): Promise<void> {
  const block = await listTasks({ listId, parentId, includeArchived: true });
  const orders = renumber(block, orderedIds);
  const now = nowUTC();
  await transaction((tx) => {
    for (const [taskId, order] of orders) {
      tx.execute("UPDATE task SET sort_order = ?, updated_at = ? WHERE id = ?", [
        order,
        now,
        taskId,
      ]);
    }
  });
  emitDbChanged("task");
}

/**
 * Moves a task (with its subtasks) to the end of another list. A subtask moved on its own
 * becomes a top-level task of the target list.
 */
export async function move(taskId: string, listId: string): Promise<Task> {
  const task = await requireTask(taskId);
  await requireList(listId);
  const order = await nextSortOrder(listId, null);
  const now = nowUTC();
  await transaction((tx) => {
    tx.execute(
      "UPDATE task SET list_id = ?, parent_id = NULL, sort_order = ?, updated_at = ? WHERE id = ?",
      [listId, order, now, taskId],
    );
    if (!task.parentId) {
      tx.execute("UPDATE task SET list_id = ?, updated_at = ? WHERE parent_id = ?", [
        listId,
        now,
        taskId,
      ]);
    }
  });
  emitDbChanged("task");
  return requireTask(taskId);
}

/** Open/total subtask counts per parent, for row badges. */
export async function subtaskProgress(
  parentIds: string[],
): Promise<Map<string, { done: number; total: number }>> {
  const result = new Map<string, { done: number; total: number }>();
  if (parentIds.length === 0) return result;
  const rows = await select(
    `SELECT parent_id, COUNT(*) AS total, SUM(status = 'done') AS done FROM task
     WHERE parent_id IN (${placeholders(parentIds.length)}) GROUP BY parent_id`,
    parentIds,
    z.object({ parent_id: z.string(), total: z.number(), done: z.number() }),
  );
  for (const row of rows) result.set(row.parent_id, { done: row.done, total: row.total });
  return result;
}

export interface OpenTaskCounts {
  today: number;
  upcoming: number;
  overdue: number;
  all: number;
  /** Open top-level tasks per list id, archived lists included. */
  byList: Map<string, number>;
}

/** Counters of the sidebar: open top-level tasks per smart view (non-archived) and per list. */
export async function countOpenTasks(today: string): Promise<OpenTaskCounts> {
  const views = await selectOne(
    `SELECT SUM(t.due_date = ?) AS today, SUM(t.due_date > ?) AS upcoming,
       SUM(t.due_date < ?) AS overdue, COUNT(*) AS total
     FROM task t JOIN todo_list l ON l.id = t.list_id
     WHERE t.status = 'open' AND t.parent_id IS NULL AND l.is_archived = 0`,
    [today, today, today],
    z.object({
      today: z.number().nullable(),
      upcoming: z.number().nullable(),
      overdue: z.number().nullable(),
      total: z.number(),
    }),
  );
  const perList = await select(
    `SELECT list_id, COUNT(*) AS count FROM task
     WHERE status = 'open' AND parent_id IS NULL GROUP BY list_id`,
    [],
    z.object({ list_id: z.string(), count: z.number() }),
  );
  return {
    today: views?.today ?? 0,
    upcoming: views?.upcoming ?? 0,
    overdue: views?.overdue ?? 0,
    all: views?.total ?? 0,
    byList: new Map(perList.map((row) => [row.list_id, row.count])),
  };
}

// Tags -----------------------------------------------------------------------

export function listTaskTags(taskId: string): Promise<Tag[]> {
  return listTagsFor("task", taskId);
}

export function setTaskTags(taskId: string, tagIds: string[]): Promise<void> {
  return setTagsFor("task", taskId, tagIds);
}
