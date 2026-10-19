import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getEffectiveBinding, resetAll } from "@/shared/hotkeys";
import { KeyRecorder } from "@/shared/hotkeys/KeyRecorder";
import { handleKeyDown } from "@/shared/hotkeys/useHotkey";

function press(target: Element, key: string, code: string, init: KeyboardEventInit = {}) {
  act(() => {
    fireEvent.keyDown(target, { key, code, ...init });
  });
}

function renderRecorder(actionId: Parameters<typeof KeyRecorder>[0]["actionId"]) {
  const onDone = vi.fn();
  render(<KeyRecorder actionId={actionId} onDone={onDone} />);
  return { onDone, capture: screen.getByTestId("key-recorder") };
}

beforeEach(() => {
  localStorage.clear();
  resetAll();
});

describe("KeyRecorder", () => {
  it("accepts a valid combination and saves it with Enter", () => {
    const { onDone, capture } = renderRecorder("calendar.goToToday");
    expect(capture).toHaveFocus();
    expect(screen.getByText("Pulsa una combinación…")).toBeInTheDocument();

    press(capture, "h", "KeyH");
    expect(capture).toHaveTextContent("H");
    press(capture, "Enter", "Enter");

    expect(getEffectiveBinding("calendar.goToToday")).toBe("H");
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("rejects a reserved combination", () => {
    const { onDone, capture } = renderRecorder("nav.today");
    press(capture, "c", "KeyC", { ctrlKey: true });

    expect(screen.getByText("Esta combinación está reservada por el sistema")).toBeInTheDocument();
    press(capture, "Enter", "Enter");
    expect(getEffectiveBinding("nav.today")).toBe("Ctrl+1");
    expect(onDone).not.toHaveBeenCalled();
  });

  it("detects a conflict and swaps the bindings", () => {
    const { onDone, capture } = renderRecorder("theme.cycle");
    press(capture, "2", "Digit2", { ctrlKey: true });

    expect(screen.getByText("Ya la usa «Ir a Calendario» (Global)")).toBeInTheDocument();
    // Enter does not save over a conflict.
    press(capture, "Enter", "Enter");
    expect(getEffectiveBinding("theme.cycle")).toBe("Ctrl+Shift+T");

    fireEvent.click(screen.getByRole("button", { name: "Intercambiar" }));
    expect(getEffectiveBinding("theme.cycle")).toBe("Ctrl+2");
    expect(getEffectiveBinding("nav.calendar")).toBe("Ctrl+Shift+T");
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("replaces: the other action is left without a shortcut", () => {
    const { capture } = renderRecorder("theme.cycle");
    press(capture, "2", "Digit2", { ctrlKey: true });
    fireEvent.click(screen.getByRole("button", { name: "Reemplazar" }));
    expect(getEffectiveBinding("theme.cycle")).toBe("Ctrl+2");
    expect(getEffectiveBinding("nav.calendar")).toBeNull();
  });

  it("Backspace disables the action and Escape cancels", () => {
    const first = renderRecorder("todo.delete");
    press(first.capture, "Backspace", "Backspace");
    expect(getEffectiveBinding("todo.delete")).toBeNull();
    expect(first.onDone).toHaveBeenCalled();
  });

  it("Escape keeps the current binding", () => {
    const { onDone, capture } = renderRecorder("calendar.goToToday");
    press(capture, "h", "KeyH");
    press(capture, "Escape", "Escape");
    expect(getEffectiveBinding("calendar.goToToday")).toBe("T");
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("records chords for chord actions", () => {
    const { capture } = renderRecorder("todo.viewToday");
    press(capture, "g", "KeyG");
    press(capture, "h", "KeyH");
    press(capture, "Enter", "Enter");
    expect(getEffectiveBinding("todo.viewToday")).toBe("G H");
  });

  it("keeps app shortcuts from firing while recording", () => {
    const { capture } = renderRecorder("calendar.goToToday");
    const event = new KeyboardEvent("keydown", {
      key: "1",
      code: "Digit1",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      capture.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    expect(handleKeyDown(event).type).toBe("none");
  });
});
