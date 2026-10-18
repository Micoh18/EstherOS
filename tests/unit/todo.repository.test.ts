// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import {
  INBOX_LIST_ID,
  NewTaskSchema,
  archiveList,
  createList,
  createSubtask,
  createTask,
  deleteList,
  getTask,
  listLists,
  listOverdue,
  listTasks,
  listTasksForDate,
  listTaskTags,
  listUpcoming,
  move,
  reorder,
  setDue,
  setTaskTags,
  toggleDone,
  updateTask,
} from "@/features/todo";
import { ensureTag } from "@/shared/db";
import { useMemoryDb } from "./helpers/memoryDb";

beforeEach(() => {
  useMemoryDb();
});

describe("todo lists", () => {
  it("seeds Inbox", async () => {
    const lists = await listLists();
    expect(lists.map((l) => l.id)).toEqual([INBOX_LIST_ID]);
  });

  it("rejects duplicate names case-insensitively", async () => {
    await createList({ name: "Casa" });
    await expect(createList({ name: "casa" })).rejects.toThrow();
  });

  it("deleting a list moves its open and done tasks to Inbox", async () => {
    await createTask({ title: "Inbox task" });
    const home = await createList({ name: "Casa" });
    const open = await createTask({ title: "Regar plantas", listId: home.id });
    const done = await createTask({ title: "Lavar", listId: home.id });
    await toggleDone(done.id);

    await deleteList(home.id);

    const inbox = await listTasks({ listId: INBOX_LIST_ID });
    expect(inbox.map((t) => t.title)).toEqual(["Inbox task", "Regar plantas", "Lavar"]);
    expect((await getTask(open.id))?.listId).toBe(INBOX_LIST_ID);
    expect((await getTask(done.id))?.status).toBe("done");
    expect((await listLists({ includeArchived: true })).map((l) => l.id)).toEqual([INBOX_LIST_ID]);
  });

  it("Inbox cannot be deleted", async () => {
    await expect(deleteList(INBOX_LIST_ID)).rejects.toThrow();
  });

  it("archived lists disappear from smart views", async () => {
    const work = await createList({ name: "Trabajo" });
    await createTask({ title: "Informe", listId: work.id, dueDate: "2026-10-18" });
    await archiveList(work.id);
    expect(await listTasksForDate("2026-10-18")).toHaveLength(0);
    expect(await listLists()).toHaveLength(1);
  });
});

describe("tasks", () => {
  it("due_time without due_date fails validation", async () => {
    expect(NewTaskSchema.safeParse({ title: "x", dueTime: "10:00" }).success).toBe(false);
    await expect(createTask({ title: "x", dueTime: "10:00" })).rejects.toThrow();
    const task = await createTask({ title: "x", dueDate: "2026-10-18", dueTime: "10:00" });
    await expect(updateTask(task.id, { dueDate: null })).rejects.toThrow();
  });

  it("completing a parent completes its subtasks", async () => {
    const parent = await createTask({ title: "Mudanza" });
    const subs = [];
    for (const title of ["Cajas", "Cinta", "Camión"])
      subs.push(await createSubtask(parent.id, { title }));

    const done = await toggleDone(parent.id);

    expect(done.status).toBe("done");
    expect(done.completedAt).not.toBeNull();
    for (const sub of subs) expect((await getTask(sub.id))?.status).toBe("done");
  });

  it("reopening a parent clears completed_at and keeps subtasks done", async () => {
    const parent = await createTask({ title: "Mudanza" });
    const sub = await createSubtask(parent.id, { title: "Cajas" });
    await toggleDone(parent.id);

    const reopened = await toggleDone(parent.id);

    expect(reopened.status).toBe("open");
    expect(reopened.completedAt).toBeNull();
    expect((await getTask(sub.id))?.status).toBe("done");
  });

  it("subtasks are one level deep", async () => {
    const parent = await createTask({ title: "A" });
    const child = await createSubtask(parent.id, { title: "B" });
    await expect(createSubtask(child.id, { title: "C" })).rejects.toThrow();
  });

  it("smart views by date", async () => {
    await createTask({ title: "old", dueDate: "2026-10-10" });
    const oldDone = await createTask({ title: "old done", dueDate: "2026-10-11" });
    await toggleDone(oldDone.id);
    await createTask({ title: "today", dueDate: "2026-10-18" });
    await createTask({ title: "soon", dueDate: "2026-10-20" });
    await createTask({ title: "far", dueDate: "2026-11-30" });

    expect((await listOverdue("2026-10-18")).map((t) => t.title)).toEqual(["old"]);
    expect((await listTasksForDate("2026-10-18")).map((t) => t.title)).toEqual(["today"]);
    expect((await listUpcoming("2026-10-18", 7)).map((t) => t.title)).toEqual(["soon"]);
  });

  it("reorder persists the manual order", async () => {
    const a = await createTask({ title: "a" });
    const b = await createTask({ title: "b" });
    const c = await createTask({ title: "c" });
    await reorder(INBOX_LIST_ID, [c.id, a.id, b.id]);
    expect((await listTasks({ listId: INBOX_LIST_ID })).map((t) => t.title)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("move takes subtasks along; setDue clears time with the date", async () => {
    const list = await createList({ name: "Yo" });
    const parent = await createTask({ title: "P", dueDate: "2026-10-18", dueTime: "09:00" });
    const sub = await createSubtask(parent.id, { title: "S" });
    await move(parent.id, list.id);
    expect((await getTask(sub.id))?.listId).toBe(list.id);

    const cleared = await setDue(parent.id, null, "09:00");
    expect(cleared.dueDate).toBeNull();
    expect(cleared.dueTime).toBeNull();
  });

  it("tags", async () => {
    const task = await createTask({ title: "t" });
    const tag = await ensureTag("hogar");
    await setTaskTags(task.id, [tag.id, tag.id]);
    expect((await listTaskTags(task.id)).map((t) => t.name)).toEqual(["hogar"]);
    expect((await ensureTag("HOGAR")).id).toBe(tag.id);
  });
});
