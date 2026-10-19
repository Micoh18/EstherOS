import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Checkbox } from "../Checkbox";
import { useReducedMotionPref } from "../motion";

/** matchMedia stub whose `prefers-reduced-motion` answer can change at runtime. */
function stubSystemMotion(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      media: query,
      get matches() {
        return matches;
      },
      addEventListener: (_: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    })),
  );
  return (next: boolean) => {
    matches = next;
    listeners.forEach((listener) => listener());
  };
}

const withConfig =
  (reducedMotion: "always" | "user" | "never") =>
  ({ children }: { children: ReactNode }) => (
    <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>
  );

/** Particles of the last completion burst (decorative spans inside the checkbox). */
const particles = (root: HTMLElement) => root.querySelectorAll("button > span[aria-hidden] > span");

afterEach(() => vi.unstubAllGlobals());

describe("useReducedMotionPref", () => {
  it("follows the app toggle even when the system allows motion", () => {
    stubSystemMotion(false);
    const { result } = renderHook(useReducedMotionPref, { wrapper: withConfig("always") });
    expect(result.current).toBe(true);
  });

  it("follows the system setting live when the toggle is off", () => {
    const setSystem = stubSystemMotion(false);
    const { result } = renderHook(useReducedMotionPref, { wrapper: withConfig("user") });
    expect(result.current).toBe(false);
    act(() => setSystem(true));
    expect(result.current).toBe(true);
  });

  it("is off without MotionConfig and without the system setting", () => {
    stubSystemMotion(false);
    const { result } = renderHook(useReducedMotionPref);
    expect(result.current).toBe(false);
  });
});

describe("Checkbox with reduced motion", () => {
  it("emits particles normally", () => {
    stubSystemMotion(false);
    const { container } = render(<Checkbox aria-label="Hecha" />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Hecha" }));
    expect(particles(container).length).toBeGreaterThan(0);
  });

  it("emits no particles when the app toggle asks for reduced motion", () => {
    stubSystemMotion(false);
    const { container } = render(<Checkbox aria-label="Hecha" />, {
      wrapper: withConfig("always"),
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Hecha" }));
    expect(screen.getByRole("checkbox", { name: "Hecha" })).toBeChecked();
    expect(particles(container)).toHaveLength(0);
  });
});
