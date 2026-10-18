import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../Tabs";

function CalendarTabs(props: { onValueChange?: (value: string) => void }) {
  return (
    <Tabs defaultValue="month" onValueChange={props.onValueChange}>
      <TabsList aria-label="Vista">
        <TabsTrigger value="month">Mes</TabsTrigger>
        <TabsTrigger value="week">Semana</TabsTrigger>
        <TabsTrigger value="day">Día</TabsTrigger>
      </TabsList>
      <TabsContent value="month">Vista mensual</TabsContent>
      <TabsContent value="week">Vista semanal</TabsContent>
      <TabsContent value="day">Vista diaria</TabsContent>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("shows the default tab", () => {
    render(<CalendarTabs />);
    expect(screen.getByRole("tab", { name: "Mes" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Vista mensual")).toBeInTheDocument();
    expect(screen.queryByText("Vista semanal")).not.toBeInTheDocument();
  });

  it("switches tab on click", () => {
    const onValueChange = vi.fn();
    render(<CalendarTabs onValueChange={onValueChange} />);

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Semana" }), { button: 0 });

    expect(onValueChange).toHaveBeenCalledWith("week");
    expect(screen.getByRole("tab", { name: "Semana" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Mes" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("Vista semanal")).toBeInTheDocument();
  });

  it("supports keyboard navigation between tabs", async () => {
    render(<CalendarTabs />);
    const month = screen.getByRole("tab", { name: "Mes" });
    month.focus();
    fireEvent.keyDown(month, { key: "ArrowRight" });
    // Radix moves roving focus on the next tick.
    await waitFor(() => expect(screen.getByRole("tab", { name: "Semana" })).toHaveFocus());
  });
});
