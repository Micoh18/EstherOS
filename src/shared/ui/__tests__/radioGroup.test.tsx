import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { onRadioGroupKeyDown, radioTabIndex } from "../radioGroup";

const OPTIONS = ["Rosa", "Blanco", "Oscuro"] as const;

function Group({ initial = null }: { initial?: string | null }) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <div role="radiogroup" aria-label="Tema" onKeyDown={onRadioGroupKeyDown}>
      {OPTIONS.map((option, index) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          tabIndex={radioTabIndex(value === option, index, value !== null)}
          onClick={() => setValue(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

const radio = (name: string) => screen.getByRole("radio", { name });

describe("radio group keyboard", () => {
  it("keeps a single tab stop: the checked radio, or the first one", () => {
    const { unmount } = render(<Group initial="Blanco" />);
    expect(radio("Blanco")).toHaveAttribute("tabindex", "0");
    expect(radio("Rosa")).toHaveAttribute("tabindex", "-1");
    unmount();

    render(<Group />);
    expect(radio("Rosa")).toHaveAttribute("tabindex", "0");
    expect(radio("Oscuro")).toHaveAttribute("tabindex", "-1");
  });

  it("arrows move focus and select, wrapping at both ends", () => {
    render(<Group initial="Rosa" />);
    radio("Rosa").focus();

    fireEvent.keyDown(radio("Rosa"), { key: "ArrowRight" });
    expect(radio("Blanco")).toHaveFocus();
    expect(radio("Blanco")).toHaveAttribute("aria-checked", "true");

    fireEvent.keyDown(radio("Blanco"), { key: "ArrowDown" });
    fireEvent.keyDown(radio("Oscuro"), { key: "ArrowDown" });
    expect(radio("Rosa")).toHaveFocus();
    expect(radio("Rosa")).toHaveAttribute("aria-checked", "true");

    fireEvent.keyDown(radio("Rosa"), { key: "ArrowLeft" });
    expect(radio("Oscuro")).toHaveFocus();
    expect(radio("Oscuro")).toHaveAttribute("tabindex", "0");

    fireEvent.keyDown(radio("Oscuro"), { key: "ArrowUp" });
    expect(radio("Blanco")).toHaveFocus();
  });

  it("marks handled arrows as default-prevented and ignores other keys", () => {
    render(<Group initial="Rosa" />);
    const arrow = new KeyboardEvent("keydown", {
      key: "ArrowRight",
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      radio("Rosa").dispatchEvent(arrow);
    });
    expect(arrow.defaultPrevented).toBe(true);

    const other = new KeyboardEvent("keydown", { key: "a", bubbles: true, cancelable: true });
    radio("Blanco").dispatchEvent(other);
    expect(other.defaultPrevented).toBe(false);
    expect(radio("Blanco")).toHaveAttribute("aria-checked", "true");
  });
});
