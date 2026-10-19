import { fireEvent, render, screen } from "@testing-library/react";
import { isSameDay } from "date-fns";
import { describe, expect, it, vi } from "vitest";
import { DatePicker } from "../DatePicker";
import { MonthGrid } from "../MonthGrid";

describe("DatePicker", () => {
  it("navigates to the next month and picks a day", () => {
    const onChange = vi.fn();
    render(<DatePicker value={new Date(2026, 9, 18)} onChange={onChange} aria-label="Fecha" />);

    const trigger = screen.getByRole("button", { name: "Fecha" });
    expect(trigger).toHaveTextContent("18 oct 2026");

    fireEvent.click(trigger);
    expect(screen.getByText("Octubre 2026")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));
    expect(screen.getByText("Noviembre 2026")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /15 de noviembre de 2026/ }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const picked = onChange.mock.calls[0][0] as Date;
    expect(isSameDay(picked, new Date(2026, 10, 15))).toBe(true);
    // Closes after picking.
    expect(screen.queryByText("Noviembre 2026")).not.toBeInTheDocument();
  });

  it("opens as a named dialog with the selected day focused", () => {
    render(<DatePicker value={new Date(2026, 9, 18)} onChange={vi.fn()} aria-label="Fecha" />);
    fireEvent.click(screen.getByRole("button", { name: "Fecha" }));
    expect(screen.getByRole("dialog", { name: "Elegir fecha" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /18 de octubre de 2026/ })).toHaveFocus();
  });

  it("clears the value", () => {
    const onChange = vi.fn();
    render(<DatePicker value={new Date(2026, 9, 18)} onChange={onChange} aria-label="Fecha" />);
    fireEvent.click(screen.getByRole("button", { name: "Fecha" }));
    fireEvent.click(screen.getByRole("button", { name: "Quitar" }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

describe("MonthGrid", () => {
  it("starts weeks on Monday by default and marks the selected day", () => {
    render(<MonthGrid selected={new Date(2026, 9, 18)} today={new Date(2026, 9, 18)} />);
    const headers = screen.getAllByRole("columnheader");
    expect(headers[0]).toHaveTextContent("Lu");
    const day = screen.getByRole("button", { name: /18 de octubre de 2026/ });
    expect(day.closest('[role="gridcell"]')).toHaveAttribute("aria-selected", "true");
  });

  it("moves focus with the arrow keys across months", () => {
    render(<MonthGrid selected={new Date(2026, 9, 31)} today={new Date(2026, 9, 31)} />);
    const day = screen.getByRole("button", { name: /31 de octubre de 2026/ });
    day.focus();
    fireEvent.keyDown(day, { key: "ArrowRight" });
    expect(screen.getByText("Noviembre 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^domingo 1 de noviembre de 2026$/ })).toHaveFocus();
  });
});
