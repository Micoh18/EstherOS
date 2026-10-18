// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Task } from "./model";
import {
  byPriority,
  defaultDueFor,
  describeDue,
  groupUpcoming,
  matchesSelection,
  sortTasks,
} from "./views";

const TODAY = "2026-10-18"; // Sunday

function task(overrides: Partial<Task>): Task {
  return {
    id: "t",
    listId: "inbox",
    parentId: null,
    title: "Task",
    notes: null,
    dueDate: null,
    dueTime: null,
    priority: "none",
    status: "open",
    sortOrder: 0,
    completedAt: null,
    createdAt: "2026-10-01T10:00:00Z",
    updatedAt: "2026-10-01T10:00:00Z",
    ...overrides,
  };
}

describe("matchesSelection", () => {
  const today = { kind: "view", view: "today" } as const;
  const upcoming = { kind: "view", view: "upcoming" } as const;
  const overdue = { kind: "view", view: "overdue" } as const;

  it("Hoy includes today and overdue, not future or undated", () => {
    expect(matchesSelection(task({ dueDate: TODAY }), today, TODAY)).toBe(true);
    expect(matchesSelection(task({ dueDate: "2026-10-10" }), today, TODAY)).toBe(true);
    expect(matchesSelection(task({ dueDate: "2026-10-19" }), today, TODAY)).toBe(false);
    expect(matchesSelection(task({}), today, TODAY)).toBe(false);
  });

  it("Próximas and Vencidas split around today", () => {
    expect(matchesSelection(task({ dueDate: "2026-10-19" }), upcoming, TODAY)).toBe(true);
    expect(matchesSelection(task({ dueDate: TODAY }), upcoming, TODAY)).toBe(false);
    expect(matchesSelection(task({ dueDate: "2026-10-17" }), overdue, TODAY)).toBe(true);
    expect(matchesSelection(task({ dueDate: TODAY }), overdue, TODAY)).toBe(false);
  });

  it("lists match their own top-level tasks only", () => {
    const list = { kind: "list", listId: "home" } as const;
    expect(matchesSelection(task({ listId: "home" }), list, TODAY)).toBe(true);
    expect(matchesSelection(task({ listId: "inbox" }), list, TODAY)).toBe(false);
    expect(matchesSelection(task({ listId: "home", parentId: "p" }), list, TODAY)).toBe(false);
  });
});

describe("defaultDueFor", () => {
  it("gives new tasks a date that keeps them in the view", () => {
    expect(defaultDueFor({ kind: "view", view: "today" }, TODAY)).toBe(TODAY);
    expect(defaultDueFor({ kind: "view", view: "upcoming" }, TODAY)).toBe("2026-10-19");
    expect(defaultDueFor({ kind: "view", view: "all" }, TODAY)).toBeNull();
    expect(defaultDueFor({ kind: "list", listId: "x" }, TODAY)).toBeNull();
  });
});

describe("sorting", () => {
  it("orders by priority, then by due date", () => {
    const tasks = [
      task({ id: "low", priority: "low" }),
      task({ id: "none", priority: "none" }),
      task({ id: "high-late", priority: "high", dueDate: "2026-10-30" }),
      task({ id: "high-soon", priority: "high", dueDate: "2026-10-20" }),
    ];
    expect([...tasks].sort(byPriority).map((t) => t.id)).toEqual([
      "high-soon",
      "high-late",
      "low",
      "none",
    ]);
  });

  it("due order puts undated tasks last and timed before untimed", () => {
    const tasks = [
      task({ id: "undated" }),
      task({ id: "allday", dueDate: TODAY }),
      task({ id: "timed", dueDate: TODAY, dueTime: "09:00" }),
    ];
    expect(sortTasks(tasks, "due").map((t) => t.id)).toEqual(["timed", "allday", "undated"]);
  });
});

describe("groupUpcoming", () => {
  it("groups the next 14 days by day and the rest as later", () => {
    const groups = groupUpcoming(
      [
        task({ id: "a", dueDate: "2026-10-19" }),
        task({ id: "b", dueDate: "2026-10-19" }),
        task({ id: "c", dueDate: "2026-11-01" }),
        task({ id: "d", dueDate: "2026-11-02" }),
      ],
      TODAY,
    );
    expect(groups.map((g) => [g.date, g.tasks.map((t) => t.id)])).toEqual([
      ["2026-10-19", ["a", "b"]],
      ["2026-11-01", ["c"]],
      [null, ["d"]],
    ]);
  });
});

describe("describeDue", () => {
  it("names nearby days and counts days ago", () => {
    expect(describeDue(TODAY, TODAY).relative).toBe("today");
    expect(describeDue("2026-10-19", TODAY).relative).toBe("tomorrow");
    expect(describeDue("2026-10-17", TODAY).relative).toBe("yesterday");
    expect(describeDue("2026-10-15", TODAY)).toMatchObject({
      relative: "daysAgo",
      daysAgo: 3,
      tone: "overdue",
    });
  });

  it("shows the weekday this week and a short date later", () => {
    expect(describeDue("2026-10-23", TODAY).dateText).toBe("Vie 23");
    expect(describeDue("2026-11-03", TODAY).dateText).toBe("3 nov");
    expect(describeDue("2027-01-05", TODAY).dateText).toBe("5 ene 2027");
  });
});
