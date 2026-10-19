import { describe, expect, it } from "vitest";
import { isTheme, nextTheme, resolveTheme } from "./themeState";

describe("theme helpers", () => {
  it("resolves system to dark or white, never pink", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("white");
    expect(resolveTheme("pink", true)).toBe("pink");
  });

  it("cycles pink → white → dark → pink", () => {
    expect(nextTheme("pink", "pink")).toBe("white");
    expect(nextTheme("white", "white")).toBe("dark");
    expect(nextTheme("dark", "dark")).toBe("pink");
  });

  it("continues from the resolved theme when following the system", () => {
    expect(nextTheme("system", "dark")).toBe("pink");
  });

  it("validates stored values", () => {
    expect(isTheme("system")).toBe(true);
    expect(isTheme("blue")).toBe(false);
    expect(isTheme(null)).toBe(false);
  });
});
