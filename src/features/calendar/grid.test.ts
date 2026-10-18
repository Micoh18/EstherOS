// @vitest-environment node
import { describe, expect, it } from "vitest";
import { toDateISO } from "@/shared/lib/dates";
import {
  buildMonthGrid,
  loadRange,
  shiftPeriod,
  toWeekStartsOn,
  visibleRange,
  weekDays,
} from "./grid";

const iso = (dates: Date[]) => dates.map(toDateISO);

describe("buildMonthGrid", () => {
  // October 2026: starts on Thursday the 1st, ends on Saturday the 31st.
  const october = new Date(2026, 9, 18);

  it("starts weeks on Monday when week_starts_on = 1", () => {
    const weeks = buildMonthGrid(october, 1);
    expect(weeks).toHaveLength(5);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(toDateISO(weeks[0][0])).toBe("2026-09-28");
    expect(weeks[0][0].getDay()).toBe(1);
    expect(toDateISO(weeks[4][6])).toBe("2026-11-01");
  });

  it("starts weeks on Sunday when week_starts_on = 0", () => {
    const weeks = buildMonthGrid(october, 0);
    expect(weeks).toHaveLength(5);
    expect(toDateISO(weeks[0][0])).toBe("2026-09-27");
    expect(weeks[0][0].getDay()).toBe(0);
    expect(toDateISO(weeks[4][6])).toBe("2026-10-31");
  });

  it("uses six rows when the month needs them", () => {
    // August 2026 starts on Saturday and has 31 days.
    const august = new Date(2026, 7, 1);
    expect(buildMonthGrid(august, 1)).toHaveLength(6);
    expect(buildMonthGrid(august, 0)).toHaveLength(6);
  });

  it("can need only four rows (February starting on the first weekday)", () => {
    // February 2026 starts on Sunday and has 28 days.
    const february = new Date(2026, 1, 10);
    expect(buildMonthGrid(february, 0)).toHaveLength(4);
    expect(buildMonthGrid(february, 1)).toHaveLength(5);
  });

  it("covers every day of the month exactly once, in order", () => {
    for (const weekStartsOn of [0, 1] as const) {
      const days = iso(buildMonthGrid(october, weekStartsOn).flat());
      const inMonth = days.filter((day) => day.startsWith("2026-10"));
      expect(inMonth).toHaveLength(31);
      expect(new Set(days).size).toBe(days.length);
      expect([...days].sort()).toEqual(days);
    }
  });
});

describe("periods", () => {
  const sunday = new Date(2026, 9, 18);

  it("returns the week around a date for both week starts", () => {
    expect(iso(weekDays(sunday, 1))[0]).toBe("2026-10-12");
    expect(iso(weekDays(sunday, 0))[0]).toBe("2026-10-18");
  });

  it("computes the visible range per view", () => {
    expect(visibleRange("day", sunday, 1)).toEqual({ from: "2026-10-18", to: "2026-10-18" });
    expect(visibleRange("week", sunday, 1)).toEqual({ from: "2026-10-12", to: "2026-10-18" });
    expect(visibleRange("month", sunday, 1)).toEqual({ from: "2026-09-28", to: "2026-11-01" });
  });

  it("loads one extra week on each side", () => {
    expect(loadRange("month", sunday, 1)).toEqual({ from: "2026-09-21", to: "2026-11-08" });
  });

  it("moves by month, week or day", () => {
    expect(toDateISO(shiftPeriod("month", new Date(2026, 0, 31), 1))).toBe("2026-02-28");
    expect(toDateISO(shiftPeriod("week", sunday, -1))).toBe("2026-10-11");
    expect(toDateISO(shiftPeriod("day", sunday, 1))).toBe("2026-10-19");
  });

  it("falls back to Monday for invalid week starts", () => {
    expect(toWeekStartsOn(0)).toBe(0);
    expect(toWeekStartsOn(6)).toBe(6);
    expect(toWeekStartsOn(9)).toBe(1);
  });
});
