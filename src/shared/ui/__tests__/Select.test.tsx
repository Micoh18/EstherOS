import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { Select } from "../Select";

// Radix Select relies on pointer capture and scrollIntoView, which jsdom does not implement.
beforeAll(() => {
  const proto = window.HTMLElement.prototype;
  proto.hasPointerCapture ??= () => false;
  proto.releasePointerCapture ??= () => {};
  proto.scrollIntoView ??= () => {};
});

const options = [
  { value: "inbox", label: "Inbox" },
  { value: "home", label: "Casa" },
  { value: "work", label: "Trabajo" },
];

describe("Select", () => {
  it("shows the placeholder when empty", () => {
    render(<Select options={options} aria-label="Lista" placeholder="Elige una lista" />);
    expect(screen.getByRole("combobox", { name: "Lista" })).toHaveTextContent("Elige una lista");
  });

  it("selects an option", () => {
    const onValueChange = vi.fn();
    render(
      <Select
        options={options}
        defaultValue="inbox"
        onValueChange={onValueChange}
        aria-label="Lista"
      />,
    );
    const trigger = screen.getByRole("combobox", { name: "Lista" });
    expect(trigger).toHaveTextContent("Inbox");

    fireEvent.keyDown(trigger, { key: "Enter" });
    const option = screen.getByRole("option", { name: "Casa" });
    fireEvent.keyDown(option, { key: "Enter" });

    expect(onValueChange).toHaveBeenCalledWith("home");
    expect(trigger).toHaveTextContent("Casa");
  });
});
