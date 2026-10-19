import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { HotkeysProvider } from "@/shared/hotkeys";
import { addDaysISO, todayISO } from "@/shared/lib/dates";
import { useMemoryDb } from "../../../../tests/unit/helpers/memoryDb";
import { INBOX_LIST_ID } from "../model";
import {
  createList,
  createSubtask,
  createTask,
  getTask,
  listSubtasks,
  listTasks,
  toggleDone,
} from "../repository";
import { resetTodoStore, useTodoStore } from "../store";
import { TodoPage } from "./TodoPage";

function renderPage(path = "/todo") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <HotkeysProvider>
        <TodoPage />
      </HotkeysProvider>
    </MemoryRouter>,
  );
}

function openList(listId: string) {
  act(() => useTodoStore.getState().selectList(listId));
}

function rowOf(title: string): HTMLElement {
  const row = screen.getByText(title).closest<HTMLElement>("[data-task-row]");
  if (!row) throw new Error(`No row for ${title}`);
  return row;
}

const today = todayISO();

beforeEach(() => {
  useMemoryDb();
  resetTodoStore();
});

describe("TodoPage", () => {
  it("quick capture parses priority and date suffixes", async () => {
    renderPage();
    openList(INBOX_LIST_ID);
    const input = screen.getByRole("textbox", { name: "Nueva tarea" });
    fireEvent.change(input, { target: { value: "Comprar flores !alta @mañana" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(await screen.findByText("Comprar flores")).toBeInTheDocument();
    const [task] = await listTasks({ listId: INBOX_LIST_ID });
    expect(task).toMatchObject({
      title: "Comprar flores",
      priority: "high",
      dueDate: addDaysISO(today, 1),
    });
    expect(input).toHaveValue("");
  });

  it("completing a task moves it to Completadas and it stays done", async () => {
    const task = await createTask({ title: "Regar plantas" });
    const view = renderPage();
    openList(INBOX_LIST_ID);

    fireEvent.click(
      await screen.findByRole("checkbox", { name: "Marcar «Regar plantas» como hecha" }),
    );
    // Still in place (checked) during the animation, then under "Completadas (1)".
    expect(screen.getByText("Regar plantas")).toBeInTheDocument();
    const completed = await screen.findByRole("button", { name: "Completadas (1)" });
    await waitFor(() => expect(screen.queryByText("Regar plantas")).not.toBeInTheDocument());
    expect((await getTask(task.id))?.status).toBe("done");

    // A fresh mount (as after a restart) reads it as done from the database.
    view.unmount();
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Completadas (1)" }));
    expect(
      await screen.findByRole("checkbox", { name: "Reabrir «Regar plantas»" }),
    ).toHaveAttribute("data-state", "checked");
    expect(completed).not.toBeInTheDocument();
  });

  it("completing a parent completes its three open subtasks", async () => {
    const parent = await createTask({ title: "Mudanza" });
    for (const title of ["Cajas", "Cinta", "Camión"]) await createSubtask(parent.id, { title });
    renderPage();
    openList(INBOX_LIST_ID);

    expect(await screen.findByText("0/3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Marcar «Mudanza» como hecha" }));
    await waitFor(async () => {
      const subtasks = await listSubtasks(parent.id);
      expect(subtasks.map((sub) => sub.status)).toEqual(["done", "done", "done"]);
    });
  });

  it("Hoy shows tasks due today with the overdue ones on top", async () => {
    await createTask({ title: "Hoy toca", dueDate: today });
    await createTask({ title: "Se me pasó", dueDate: addDaysISO(today, -2) });
    await createTask({ title: "Mañana toca", dueDate: addDaysISO(today, 1) });
    renderPage();

    expect(await screen.findByText("Hoy toca")).toBeInTheDocument();
    expect(screen.getByText("Se me pasó")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vencidas" })).toBeInTheDocument();
    expect(screen.queryByText("Mañana toca")).not.toBeInTheDocument();
  });

  it("Vencidas lists only open tasks due before today", async () => {
    await createTask({ title: "Vencida abierta", dueDate: addDaysISO(today, -3) });
    const done = await createTask({ title: "Vencida hecha", dueDate: addDaysISO(today, -3) });
    await toggleDone(done.id);
    await createTask({ title: "De hoy", dueDate: today });
    await createTask({ title: "Sin fecha" });
    renderPage();
    act(() => useTodoStore.getState().selectView("overdue"));

    expect(await screen.findByText("Vencida abierta")).toBeInTheDocument();
    expect(screen.queryByText("Vencida hecha")).not.toBeInTheDocument();
    expect(screen.queryByText("De hoy")).not.toBeInTheDocument();
    expect(screen.queryByText("Sin fecha")).not.toBeInTheDocument();
  });

  it("deleting a list moves its tasks to Inbox", async () => {
    const home = await createList({ name: "Casa" });
    const task = await createTask({ title: "Regar el jardín", listId: home.id });
    renderPage();
    openList(home.id);

    await screen.findByText("Regar el jardín");
    fireEvent.click(screen.getByRole("button", { name: "Opciones de la lista" }));
    fireEvent.click(await screen.findByRole("button", { name: "Eliminar lista" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar lista" }));

    await waitFor(async () => expect((await getTask(task.id))?.listId).toBe(INBOX_LIST_ID));
    await waitFor(() =>
      expect(useTodoStore.getState().selection).toEqual({ kind: "list", listId: INBOX_LIST_ID }),
    );
    expect(await screen.findByText("Regar el jardín")).toBeInTheDocument();
  });

  it("keyboard reorder persists the manual order", async () => {
    await createTask({ title: "Primera" });
    await createTask({ title: "Segunda" });
    const view = renderPage();
    openList(INBOX_LIST_ID);

    await screen.findByText("Primera");
    const first = rowOf("Primera");
    act(() => first.focus());
    fireEvent.keyDown(first, { key: "ArrowDown", code: "ArrowDown", altKey: true });

    await waitFor(async () =>
      expect((await listTasks({ listId: INBOX_LIST_ID })).map((t) => t.title)).toEqual([
        "Segunda",
        "Primera",
      ]),
    );
    view.unmount();
    renderPage();
    await screen.findByText("Primera");
    const titles = [...document.querySelectorAll("[data-task-row]")].map((row) => row.textContent);
    expect(titles[0]).toContain("Segunda");
    expect(titles[1]).toContain("Primera");
  });

  it("row shortcuts set priority and due date on the focused task", async () => {
    const task = await createTask({ title: "Llamar" });
    renderPage();
    openList(INBOX_LIST_ID);

    await screen.findByText("Llamar");
    const row = rowOf("Llamar");
    act(() => row.focus());
    fireEvent.keyDown(row, { key: "1", code: "Digit1" });
    await waitFor(async () => expect((await getTask(task.id))?.priority).toBe("high"));
    fireEvent.keyDown(row, { key: "T", code: "KeyT", shiftKey: true });
    await waitFor(async () =>
      expect(await getTask(task.id)).toMatchObject({ priority: "high", dueDate: today }),
    );
    fireEvent.keyDown(row, { key: ")", code: "Digit0", shiftKey: true });
    await waitFor(async () => expect((await getTask(task.id))?.dueDate).toBeNull());
  });

  it("links from other screens open a task or a view", async () => {
    const list = await createList({ name: "Casa" });
    const task = await createTask({ title: "Pintar la valla", listId: list.id });
    const view = renderPage(`/todo?task=${task.id}`);
    expect(await screen.findByRole("textbox", { name: "Título" })).toHaveValue("Pintar la valla");
    expect(useTodoStore.getState().selection).toEqual({ kind: "list", listId: list.id });
    view.unmount();

    resetTodoStore();
    renderPage(`/todo?date=${addDaysISO(today, 3)}`);
    await waitFor(() =>
      expect(useTodoStore.getState().selection).toEqual({ kind: "view", view: "upcoming" }),
    );
  });
});
