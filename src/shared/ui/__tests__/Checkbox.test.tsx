import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "../Checkbox";

describe("Checkbox", () => {
  it("toggles when uncontrolled and reports the new value", () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Comprar flores" onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole("checkbox", { name: "Comprar flores" });

    expect(box).toHaveAttribute("aria-checked", "false");
    fireEvent.click(box);
    expect(box).toHaveAttribute("aria-checked", "true");
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);

    fireEvent.click(box);
    expect(box).toHaveAttribute("aria-checked", "false");
    expect(onCheckedChange).toHaveBeenLastCalledWith(false);
  });

  it("follows the checked prop when controlled", () => {
    const onCheckedChange = vi.fn();
    const { rerender } = render(
      <Checkbox aria-label="Regar plantas" checked={false} onCheckedChange={onCheckedChange} />,
    );
    const box = screen.getByRole("checkbox", { name: "Regar plantas" });

    fireEvent.click(box);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    // The parent did not update the prop, so it stays unchecked.
    expect(box).toHaveAttribute("aria-checked", "false");

    rerender(<Checkbox aria-label="Regar plantas" checked onCheckedChange={onCheckedChange} />);
    expect(box).toHaveAttribute("aria-checked", "true");
  });

  it("works with parent state", () => {
    function Harness() {
      const [done, setDone] = useState(false);
      return (
        <>
          <Checkbox aria-label="Leer" checked={done} onCheckedChange={setDone} />
          <span>{done ? "hecha" : "pendiente"}</span>
        </>
      );
    }
    render(<Harness />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Leer" }));
    expect(screen.getByText("hecha")).toBeInTheDocument();
  });

  it("does not toggle when disabled", () => {
    render(<Checkbox aria-label="Bloqueada" disabled />);
    const box = screen.getByRole("checkbox", { name: "Bloqueada" });
    fireEvent.click(box);
    expect(box).toHaveAttribute("aria-checked", "false");
  });
});
