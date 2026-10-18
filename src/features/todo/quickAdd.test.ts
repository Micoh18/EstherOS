// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseQuickAdd } from "./quickAdd";

const TODAY = "2026-10-18";

describe("parseQuickAdd", () => {
  it("reads priority and due date suffixes", () => {
    expect(parseQuickAdd("Comprar flores !alta @mañana", TODAY)).toEqual({
      title: "Comprar flores",
      priority: "high",
      dueDate: "2026-10-19",
    });
  });

  it("maps every priority token", () => {
    expect(parseQuickAdd("a !alta", TODAY).priority).toBe("high");
    expect(parseQuickAdd("a !media", TODAY).priority).toBe("medium");
    expect(parseQuickAdd("a !baja", TODAY).priority).toBe("low");
  });

  it("maps @hoy and @mañana, also without ñ", () => {
    expect(parseQuickAdd("Regar @hoy", TODAY).dueDate).toBe(TODAY);
    expect(parseQuickAdd("Regar @manana", TODAY).dueDate).toBe("2026-10-19");
  });

  it("accepts tokens anywhere and in any case", () => {
    expect(parseQuickAdd("!ALTA Llamar a mamá @Hoy", TODAY)).toEqual({
      title: "Llamar a mamá",
      priority: "high",
      dueDate: TODAY,
    });
  });

  it("understands a decomposed ñ (n + combining tilde)", () => {
    expect(parseQuickAdd("Pan @mañana", TODAY).dueDate).toBe("2026-10-19");
  });

  it("the last token of each kind wins", () => {
    expect(parseQuickAdd("x !baja !alta @hoy @mañana", TODAY)).toEqual({
      title: "x",
      priority: "high",
      dueDate: "2026-10-19",
    });
  });

  it("leaves plain text, unknown tokens and partial words alone", () => {
    expect(parseQuickAdd("  Leer   !urgente sobre @hoyos ", TODAY)).toEqual({
      title: "Leer !urgente sobre @hoyos",
    });
  });

  it("returns an empty title when there are only tokens", () => {
    expect(parseQuickAdd("!alta @hoy", TODAY).title).toBe("");
    expect(parseQuickAdd("   ", TODAY)).toEqual({ title: "" });
  });

  it("crosses month and year boundaries", () => {
    expect(parseQuickAdd("Año nuevo @mañana", "2026-12-31").dueDate).toBe("2027-01-01");
  });
});
