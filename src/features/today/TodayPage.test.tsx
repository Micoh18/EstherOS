import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarPage, createEvent } from "@/features/calendar";
import { createEntry } from "@/features/journal";
import { setSetting } from "@/features/settings";
import { createTask, getTask, TodoPage } from "@/features/todo";
import { setDbExecutor } from "@/shared/db";
import { HotkeysProvider, resetAll } from "@/shared/hotkeys";
import { ToastProvider } from "@/shared/ui";
import { TodayPage } from "./components/TodayPage";
import { useCurrentDay } from "./hooks";
import { dayPeriod, greeting, msUntilNextMidnight } from "./model";
import { useMemoryDb } from "../../../tests/unit/helpers/memoryDb";

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname + location.search}</p>;
}

function renderToday() {
  return render(
    <MemoryRouter initialEntries={["/today"]}>
      <HotkeysProvider>
        <ToastProvider>
          <Routes>
            <Route path="/today" element={<TodayPage />} />
            <Route path="*" element={<LocationProbe />} />
          </Routes>
        </ToastProvider>
      </HotkeysProvider>
    </MemoryRouter>,
  );
}

// Radix measures some controls (Checkbox); jsdom has no ResizeObserver.
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const at = (hour: number, minute = 0) => new Date(2026, 9, 18, hour, minute); // Sunday 18 Oct

function mockNow(date: Date) {
  vi.useFakeTimers({ now: date, toFake: ["Date"] });
}

const card = (name: string) => screen.getByRole("region", { name });

describe("greeting", () => {
  it("follows the hour of the day", () => {
    expect(dayPeriod(at(4, 59))).toBe("evening");
    expect(dayPeriod(at(5))).toBe("morning");
    expect(dayPeriod(at(11, 59))).toBe("morning");
    expect(dayPeriod(at(12))).toBe("afternoon");
    expect(dayPeriod(at(19, 59))).toBe("afternoon");
    expect(dayPeriod(at(20))).toBe("evening");
  });

  it("includes the name only when there is one", () => {
    expect(greeting(at(9), "  Ana ")).toBe("Buenos días, Ana ♡");
    expect(greeting(at(9), "")).toBe("Buenos días ♡");
  });

  it("counts the time left until midnight", () => {
    expect(msUntilNextMidnight(at(23, 59))).toBe(60_000);
  });
});

describe("TodayPage", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", NoopResizeObserver);
    resetAll();
    useMemoryDb();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each([
    [at(8), "Buenos días, Ana ♡"],
    [at(15), "Buenas tardes, Ana ♡"],
    [at(22), "Buenas noches, Ana ♡"],
  ])("greets by the hour (%s)", async (now, expected) => {
    mockNow(now);
    await setSetting("user_name", "Ana");
    renderToday();
    expect(await screen.findByRole("heading", { level: 1, name: expected })).toBeInTheDocument();
    expect(screen.getByText("Domingo, 18 de octubre de 2026")).toBeInTheDocument();
  });

  it("renders the three cards and tomorrow with the day's data", async () => {
    mockNow(at(10));
    await createEvent({
      title: "Yoga",
      allDay: false,
      startAt: "2026-10-18T18:00:00",
      endAt: "2026-10-18T19:00:00",
    });
    await createEvent({ title: "Brunch", allDay: true, date: "2026-10-18" });
    await createTask({ title: "Regar plantas", dueDate: "2026-10-18" });
    await createTask({ title: "Pagar la luz", dueDate: "2026-10-15" });
    await createEntry({ date: "2026-10-17", contentText: "Ayer" });
    await createEntry({ date: "2026-10-18", contentText: "Un domingo tranquilo", mood: "great" });
    await createEvent({ title: "Dentista", allDay: true, date: "2026-10-19" });
    await createTask({ title: "Enviar informe", dueDate: "2026-10-19" });
    renderToday();

    const calendar = card("Hoy en tu calendario");
    const yoga = await within(calendar).findByRole("button", { name: /^Yoga/ });
    const brunch = within(calendar).getByRole("button", { name: /^Brunch/ });
    // All-day first, then by time.
    expect(brunch.compareDocumentPosition(yoga) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const tasks = card("Pendientes de hoy");
    await within(tasks).findByText("Regar plantas");
    const overdue = within(tasks).getByRole("region", { name: "Vencidas" });
    expect(await within(overdue).findByText("Pagar la luz")).toBeInTheDocument();
    expect(within(tasks).getByRole("textbox", { name: "Nueva tarea" })).toBeInTheDocument();

    const journal = card("Tu diario");
    expect(await within(journal).findByText("Un domingo tranquilo")).toBeInTheDocument();
    expect(within(journal).getByText("Radiante")).toBeInTheDocument();
    expect(within(journal).getByText("2 días seguidos escribiendo")).toBeInTheDocument();

    const tomorrow = screen.getByRole("region", { name: /Mañana/ });
    expect(await within(tomorrow).findByRole("button", { name: /^Dentista/ })).toBeInTheDocument();
    expect(
      within(tomorrow).getByRole("button", { name: "Tarea: Enviar informe" }),
    ).toBeInTheDocument();
  });

  it("shows the empty states of a blank day", async () => {
    mockNow(at(10));
    renderToday();
    expect(await screen.findByText("Día libre")).toBeInTheDocument();
    expect(screen.getByText("Nada pendiente para hoy. Respira hondo ♡")).toBeInTheDocument();
    expect(screen.getByText("¿Cómo va el día?")).toBeInTheDocument();
    expect(screen.getByText("Empieza tu racha hoy")).toBeInTheDocument();
    expect(screen.getByText("Mañana está libre por ahora.")).toBeInTheDocument();
  });

  it("completes a task in place and stores it as done", async () => {
    mockNow(at(10));
    const task = await createTask({ title: "Regar plantas", dueDate: "2026-10-18" });
    renderToday();

    fireEvent.click(
      await screen.findByRole("checkbox", { name: "Marcar «Regar plantas» como hecha" }),
    );
    await waitFor(async () => expect((await getTask(task.id))?.status).toBe("done"));
    // Still listed for today, now checked.
    expect(
      await screen.findByRole("checkbox", { name: "Reabrir «Regar plantas»" }),
    ).toBeInTheDocument();
  });

  it("quick capture creates a task due today", async () => {
    mockNow(at(10));
    renderToday();
    const input = await screen.findByRole("textbox", { name: "Nueva tarea" });
    fireEvent.change(input, { target: { value: "Llamar a mamá" } });
    fireEvent.keyDown(input, { key: "Enter" });
    const tasks = card("Pendientes de hoy");
    expect(await within(tasks).findByText("Llamar a mamá")).toBeInTheDocument();
  });

  it("the + button starts a new event on today in the calendar", async () => {
    mockNow(at(10));
    renderToday();
    fireEvent.click(await screen.findByRole("button", { name: "Nuevo evento hoy" }));
    expect(await screen.findByTestId("location")).toHaveTextContent(
      "/calendar?date=2026-10-18&new=1",
    );
  });

  it("shortcuts open the calendar and the journal, and focus the quick capture", async () => {
    mockNow(at(10));
    const view = renderToday();
    const input = await screen.findByRole("textbox", { name: "Nueva tarea" });
    act(() => {
      fireEvent.keyDown(window, { key: "n", code: "KeyN", ctrlKey: true });
    });
    expect(input).toHaveFocus();
    input.blur();

    act(() => {
      fireEvent.keyDown(window, { key: "c", code: "KeyC" });
    });
    expect(await screen.findByTestId("location")).toHaveTextContent("/calendar?date=2026-10-18");
    view.unmount();

    renderToday();
    await screen.findByRole("textbox", { name: "Nueva tarea" });
    act(() => {
      fireEvent.keyDown(window, { key: "j", code: "KeyJ" });
    });
    expect(await screen.findByTestId("location")).toHaveTextContent("/journal");
  });
});

describe("integration", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", NoopResizeObserver);
    resetAll();
    useMemoryDb();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("completing a task in Hoy updates Tareas and the calendar without reloading", async () => {
    mockNow(at(10));
    await createTask({ title: "Regar plantas", dueDate: "2026-10-18" });
    await createTask({ title: "Barrer", dueDate: "2026-10-18" });
    render(
      <MemoryRouter initialEntries={["/today"]}>
        <HotkeysProvider>
          <ToastProvider>
            <TodayPage />
            <div data-testid="todo">
              <TodoPage />
            </div>
            <div data-testid="calendar">
              <CalendarPage />
            </div>
          </ToastProvider>
        </HotkeysProvider>
      </MemoryRouter>,
    );

    const calendar = screen.getByTestId("calendar");
    const cell = await within(calendar).findByRole("gridcell", { name: /domingo 18 de octubre/i });
    await within(cell).findByTitle("2 tareas vencen");
    const todo = screen.getByTestId("todo");
    await within(todo).findByText("Regar plantas");

    fireEvent.click(
      await within(card("Pendientes de hoy")).findByRole("checkbox", {
        name: "Marcar «Regar plantas» como hecha",
      }),
    );

    expect(await within(cell).findByTitle("1 tarea vence")).toBeInTheDocument();
    expect(
      await within(todo).findByRole("button", { name: "Completadas (1)" }, { timeout: 3000 }),
    ).toBeInTheDocument();
  });
});

describe("TodayPage loading and errors", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", NoopResizeObserver);
    resetAll();
    mockNow(at(10));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows placeholders, not empty states, while the cards load", async () => {
    const never = () => new Promise<never>(() => {});
    setDbExecutor({ select: never, execute: never, batch: never });
    renderToday();

    for (const name of ["Pendientes de hoy", "Hoy en tu calendario", "Tu diario"]) {
      expect(within(card(name)).getByRole("status", { name: "Cargando…" })).toBeInTheDocument();
    }
    expect(screen.queryByText("Nada pendiente para hoy. Respira hondo ♡")).not.toBeInTheDocument();
    expect(screen.queryByText("Día libre")).not.toBeInTheDocument();
    expect(screen.queryByText("¿Cómo va el día?")).not.toBeInTheDocument();
  });

  it("says it could not load instead of showing an empty day", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fail = () => Promise.reject(new Error("db is gone"));
    setDbExecutor({ select: fail, execute: fail, batch: fail });
    renderToday();

    expect(
      await within(card("Pendientes de hoy")).findByText("No pude cargar tus tareas."),
    ).toBeInTheDocument();
    expect(
      await within(card("Hoy en tu calendario")).findByText("No pude cargar los eventos de hoy."),
    ).toBeInTheDocument();
    expect(
      await within(card("Tu diario")).findByText("No pude cargar tu diario de hoy."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Nada pendiente para hoy. Respira hondo ♡")).not.toBeInTheDocument();
    expect(screen.queryByText("Día libre")).not.toBeInTheDocument();
    expect(screen.queryByText("¿Cómo va el día?")).not.toBeInTheDocument();
  });
});

describe("useCurrentDay", () => {
  afterEach(() => vi.useRealTimers());

  it("moves to the next day at midnight and when the window gets the focus back", () => {
    vi.useFakeTimers({ now: at(23, 59) });
    const { result } = renderHook(() => useCurrentDay());
    expect(result.current).toBe("2026-10-18");

    act(() => vi.advanceTimersByTime(61_000));
    expect(result.current).toBe("2026-10-19");

    // Asleep past the next midnight: the focus event catches up.
    vi.setSystemTime(new Date(2026, 9, 21, 9, 0));
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(result.current).toBe("2026-10-21");
  });

  it("reschedules the midnight timer when it fires early after a clock change", () => {
    vi.useFakeTimers({ now: at(23, 59) });
    const { result } = renderHook(() => useCurrentDay());

    // The clock goes back two hours before the timer fires: the day has not changed yet.
    vi.setSystemTime(at(21, 59));
    act(() => vi.advanceTimersByTime(61_000));
    expect(result.current).toBe("2026-10-18");

    act(() => vi.advanceTimersByTime(2 * 60 * 60_000));
    expect(result.current).toBe("2026-10-19");
  });
});
