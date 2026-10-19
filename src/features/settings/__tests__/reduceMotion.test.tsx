import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Checkbox } from "@/shared/ui";
import { useMemoryDb } from "../../../../tests/unit/helpers/memoryDb";
import { setReduceMotion } from "../appearance";
import { AppearanceProvider } from "../components/AppearanceProvider";

const particles = (root: HTMLElement) => root.querySelectorAll("button > span[aria-hidden] > span");

beforeEach(() => {
  useMemoryDb();
  setReduceMotion(false);
});

afterEach(() => setReduceMotion(false));

describe("Reducir animaciones", () => {
  it("turns off the completion particles of components using the shared hook", () => {
    const { container } = render(
      <AppearanceProvider>
        <Checkbox aria-label="Primera" />
        <Checkbox aria-label="Segunda" />
      </AppearanceProvider>,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Primera" }));
    expect(particles(container).length).toBeGreaterThan(0);

    act(() => setReduceMotion(true));
    expect(document.documentElement).toHaveClass("reduce-motion");
    const before = particles(container).length;
    fireEvent.click(screen.getByRole("checkbox", { name: "Segunda" }));
    expect(particles(container).length).toBe(before);
  });
});
