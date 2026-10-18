import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import Database from "better-sqlite3";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEntry } from "@/features/journal";
import { createTask } from "@/features/todo";
import { setDbExecutor, type SqlValue } from "@/shared/db";
import { CalendarPage } from "./components/CalendarPage";
import { createEvent, listEventsInRange } from "./repository";
import { useCalendarStore } from "./store";

const TODAY = new Date(2026, 9, 18, 10, 0); // Sunday 18 Oct 2026

/**
 * In-memory SQLite with the real migration. Same idea as tests/unit/helpers/memoryDb, which
 * resolves the migration through import.meta.url and cannot run under jsdom.
 */
function useMemoryDb() {
  const raw = new Database(":memory:");
  raw.pragma("foreign_keys = ON");
  raw.exec(readFileSync(join(process.cwd(), "src-tauri/migrations/0001_init.sql"), "utf8"));
  const run = (sql: string, params: SqlValue[]) => {
    const statement = raw.prepare(sql);
    if (statement.reader) return { rows: statement.all(...params), changes: 0 };
    return { rows: [], changes: statement.run(...params).changes };
  };
  setDbExecutor({
    select: async (sql, params) => run(sql, params).rows as Record<string, unknown>[],
    execute: async (sql, params) => ({ rowsAffected: run(sql, params).changes }),
    batch: async (statements) => {
      raw.transaction(() => {
        for (const { sql, params } of statements) run(sql, params);
      })();
    },
  });
}

function renderCalendar() {
  return render(
    <MemoryRouter>
      <CalendarPage />
    </MemoryRouter>,
  );
}

// Radix measures some controls (Switch, Checkbox); jsdom has no ResizeObserver.
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("CalendarPage", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", NoopResizeObserver);
    vi.useFakeTimers({ now: TODAY, toFake: ["Date"] });
    useMemoryDb();
    useCalendarStore.setState({
      view: "month",
      focusedDate: "2026-10-18",
      selectedDate: "2026-10-18",
      panelOpen: true,
      viewInitialized: true,
      dialog: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows the same events in month, week and day views", async () => {
    await createEvent({ title: "Brunch", allDay: true, date: "2026-10-18" });
    await createEvent({
      title: "Yoga",
      allDay: false,
      startAt: "2026-10-18T07:30:00",
      endAt: "2026-10-18T08:30:00",
    });
    renderCalendar();

    const grid = await screen.findByRole("grid");
    const cell = within(grid).getByRole("gridcell", { name: /domingo 18 de octubre/i });
    await within(cell).findByText("Brunch");
    expect(within(cell).getByText("Yoga")).toBeInTheDocument();

    act(() => useCalendarStore.getState().setView("week"));
    expect(
      (await screen.findAllByRole("button", { name: /^Yoga · 07:30/ })).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /^Brunch/ }).length).toBeGreaterThan(0);

    act(() => useCalendarStore.getState().setView("day"));
    expect(
      (await screen.findAllByRole("button", { name: /^Yoga · 07:30/ })).length,
    ).toBeGreaterThan(0);
  });

  it("titles the month view with the focused month, not the first grid day", async () => {
    renderCalendar();
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Octubre 2026");
  });

  it("draws past logs with a dashed edge", async () => {
    await createEvent({ title: "Concierto", allDay: true, date: "2026-10-10" });
    renderCalendar();
    const chip = await screen.findByRole("button", { name: /^Concierto/ });
    expect(chip).toHaveAttribute("data-past-log", "true");
    expect(chip.className).toContain("border-dashed");
  });

  it("shows the journal and tasks due of the selected day in the side panel", async () => {
    await createTask({ title: "Comprar flores", dueDate: "2026-10-20" });
    await createEntry({ date: "2026-10-20", contentText: "Un día bonito", mood: "great" });
    renderCalendar();

    const grid = await screen.findByRole("grid");
    fireEvent.click(within(grid).getByRole("gridcell", { name: /martes 20 de octubre/i }));

    const panel = screen.getByRole("complementary", { name: /detalle del día/i });
    await within(panel).findByText("Comprar flores");
    expect(within(panel).getByText("Radiante")).toBeInTheDocument();
    expect(within(panel).getByText("Escribiste en el diario")).toBeInTheDocument();
  });

  it("shows day indicators for journal entries and tasks due in month cells", async () => {
    await createTask({ title: "A", dueDate: "2026-10-22" });
    await createTask({ title: "B", dueDate: "2026-10-22" });
    await createEntry({ date: "2026-10-22", contentText: "Hola" });
    renderCalendar();

    const grid = await screen.findByRole("grid");
    const cell = within(grid).getByRole("gridcell", { name: /jueves 22 de octubre/i });
    expect(await within(cell).findByTitle("2 tareas vencen")).toHaveTextContent("2");
    expect(within(cell).getByTitle("Tiene entrada de diario")).toBeInTheDocument();
  });

  it("creates a past event as a past log by default from the dialog", async () => {
    renderCalendar();
    act(() => useCalendarStore.getState().openCreate({ date: "2026-10-05", allDay: true }));

    const dialog = await screen.findByRole("dialog");
    const pastLog = within(dialog).getByRole("checkbox");
    expect(pastLog).toHaveAttribute("data-state", "checked");
    fireEvent.change(within(dialog).getByLabelText("Título"), {
      target: { value: "Paseo" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const [saved] = await listEventsInRange("2026-10-05", "2026-10-05");
    expect(saved).toMatchObject({ title: "Paseo", isPastLog: true });
  });

  it("asks before deleting a recurring series", async () => {
    const event = await createEvent({
      title: "Clase",
      allDay: true,
      date: "2026-10-19",
      recurrence: "weekly",
    });
    renderCalendar();
    act(() => useCalendarStore.getState().openEdit(event.id));

    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByDisplayValue("Clase");
    fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Se eliminarán todas las repeticiones",
    );
    expect(await listEventsInRange("2026-10-19", "2026-10-19")).toHaveLength(1);

    fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar todo" }));
    await waitFor(async () =>
      expect(await listEventsInRange("2026-10-01", "2026-12-31")).toHaveLength(0),
    );
  });
});
