import { describe, expect, it, vi } from "vitest";
import { ESCAPE_CLOSE_EVENT, closeTopmostEscapable } from "./escape";

describe("closeTopmostEscapable", () => {
  it("notifies only the last escapable element", () => {
    document.body.innerHTML =
      '<div id="a" data-escape-close></div><div id="b" data-escape-close></div>';
    const first = vi.fn();
    const last = vi.fn();
    document.getElementById("a")?.addEventListener(ESCAPE_CLOSE_EVENT, first);
    document.getElementById("b")?.addEventListener(ESCAPE_CLOSE_EVENT, last);
    expect(closeTopmostEscapable()).toBe(true);
    expect(last).toHaveBeenCalledOnce();
    expect(first).not.toHaveBeenCalled();
  });

  it("does nothing when nothing can close", () => {
    document.body.innerHTML = "";
    expect(closeTopmostEscapable()).toBe(false);
  });
});
