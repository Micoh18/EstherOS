import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Task } from "../model";
import { resetTodoStore, useTodoStore } from "../store";
import { COMPLETE_DELAY_MS } from "../views";
import { TaskRow } from "./TaskRow";

const toggleDone = vi.hoisted(() => vi.fn(async (id: string) => ({ id })));

vi.mock("../repository", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../repository")>()),
  toggleDone,
}));

const task: Task = {
  id: "task-1",
  listId: "inbox",
  parentId: null,
  title: "Comprar flores",
  notes: null,
  dueDate: null,
  dueTime: null,
  priority: "high",
  status: "open",
  sortOrder: 0,
  completedAt: null,
  createdAt: "2026-10-18T10:00:00Z",
  updatedAt: "2026-10-18T10:00:00Z",
};

describe("TaskRow", () => {
  beforeEach(() => {
    resetTodoStore();
    toggleDone.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it("checking the box completes the task through the repository", async () => {
    vi.useFakeTimers();
    render(<TaskRow task={task} compact />);

    const checkbox = screen.getByRole("checkbox", { name: "Marcar «Comprar flores» como hecha" });
    fireEvent.click(checkbox);

    expect(toggleDone).toHaveBeenCalledWith("task-1");
    // The row stays checked in place while the completion animation runs…
    expect(checkbox).toHaveAttribute("data-state", "checked");
    expect(useTodoStore.getState().completing["task-1"]?.status).toBe("done");
    // …and is released after the delay so it can move to "Completadas".
    await vi.advanceTimersByTimeAsync(COMPLETE_DELAY_MS);
    expect(useTodoStore.getState().completing["task-1"]).toBeUndefined();
  });

  it("unchecking a done task reopens it", () => {
    render(<TaskRow task={{ ...task, status: "done", completedAt: "2026-10-18T11:00:00Z" }} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Reabrir «Comprar flores»" }));
    expect(toggleDone).toHaveBeenCalledWith("task-1");
    expect(useTodoStore.getState().completing).toEqual({});
  });

  it("shows the title, the priority flag and opens the detail on click", () => {
    render(<TaskRow task={task} />);
    expect(screen.getByText("Comprar flores")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Prioridad alta" })).toBeInTheDocument();
    fireEvent.click(screen.getByText("Comprar flores"));
    expect(useTodoStore.getState().selectedTaskId).toBe("task-1");
  });
});
