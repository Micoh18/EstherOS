import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { getEffectiveBinding, resetAll, setBinding } from "@/shared/hotkeys";
import { ShortcutsSheet } from "@/shared/hotkeys/ShortcutsSheet";
import { ShortcutsSection } from "../components/ShortcutsSection";

const row = (id: string) => document.querySelector(`tr[data-action-id="${id}"]`) as HTMLElement;

beforeEach(() => {
  localStorage.clear();
  resetAll();
});

describe("ShortcutsSection", () => {
  it("lists every scope group with status", () => {
    render(<ShortcutsSection />);
    for (const group of ["Global", "Hoy", "Calendario", "Diario", "Editor", "Tareas"]) {
      expect(screen.getByRole("region", { name: group })).toBeInTheDocument();
    }
    expect(within(row("nav.today")).getByText("Predeterminado")).toBeInTheDocument();
    expect(
      within(row("todo.newTask")).getByText("Hereda de «Nuevo según contexto» según contexto"),
    ).toBeInTheDocument();
    // Fixed actions are not editable.
    expect(within(row("editor.bold")).queryByRole("button")).toBeNull();
  });

  it("filters by name or by combination", () => {
    render(<ShortcutsSection />);
    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "ctrl+2" } });
    expect(row("nav.calendar")).toBeInTheDocument();
    expect(row("nav.today")).toBeNull();

    fireEvent.change(search, { target: { value: "ir a diario" } });
    expect(row("nav.journal")).toBeInTheDocument();
    expect(row("nav.calendar")).toBeNull();
  });

  it("records from the row, shows custom status and resets", () => {
    render(<ShortcutsSection />);
    fireEvent.click(screen.getByRole("button", { name: "Cambiar el atajo de «Ir a hoy»" }));
    const capture = screen.getByTestId("key-recorder");
    act(() => {
      fireEvent.keyDown(capture, { key: "h", code: "KeyH" });
    });
    act(() => {
      fireEvent.keyDown(capture, { key: "Enter", code: "Enter" });
    });
    expect(getEffectiveBinding("calendar.goToToday")).toBe("H");
    expect(within(row("calendar.goToToday")).getByText("Personalizado")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Restablecer «Ir a hoy»" }));
    expect(getEffectiveBinding("calendar.goToToday")).toBe("T");
  });

  it("reset all asks for confirmation inline", () => {
    setBinding("nav.today", "Ctrl+Shift+1");
    setBinding("todo.delete", null);
    render(<ShortcutsSection />);
    expect(within(row("todo.delete")).getByText("Desactivado")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Restablecer todos" }));
    expect(getEffectiveBinding("nav.today")).toBe("Ctrl+Shift+1");
    fireEvent.click(screen.getByRole("button", { name: "Sí, restablecer" }));
    expect(getEffectiveBinding("nav.today")).toBe("Ctrl+1");
    expect(getEffectiveBinding("todo.delete")).toBe("Delete");
  });
});

describe("ShortcutsSheet", () => {
  it("shows the effective bindings of the given scopes", () => {
    setBinding("calendar.goToToday", "H");
    render(<ShortcutsSheet onClose={() => {}} scopes={["calendar", "global"]} />);
    const item = document.querySelector('li[data-action-id="calendar.goToToday"]') as HTMLElement;
    expect(item).toHaveTextContent("H");
    expect(document.querySelector('li[data-action-id="nav.today"]')).toBeInTheDocument();
    expect(document.querySelector('li[data-action-id="todo.delete"]')).toBeNull();
  });
});
