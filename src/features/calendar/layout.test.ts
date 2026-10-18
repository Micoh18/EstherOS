// @vitest-environment node
import { describe, expect, it } from "vitest";
import { groupByDay, layoutColumns, occursOn, timedSegmentsFor } from "./layout";
import type { EventOccurrence } from "./model";

const item = (id: string, start: number, end: number) => ({ id, start, end });
const h = (hours: number) => hours * 60;

function columnsById<T extends { id: string }>(placed: { item: T; column: number }[]) {
  return Object.fromEntries(placed.map((p) => [p.item.id, p.column]));
}

describe("layoutColumns", () => {
  it("keeps non-overlapping items in a single full-width column", () => {
    const { placed, overflow } = layoutColumns([
      item("a", h(9), h(10)),
      item("b", h(10), h(11)),
      item("c", h(13), h(14)),
    ]);
    expect(placed.map((p) => [p.item.id, p.column, p.columns])).toEqual([
      ["a", 0, 1],
      ["b", 0, 1],
      ["c", 0, 1],
    ]);
    expect(overflow).toEqual([]);
  });

  it("splits overlapping items into columns and reuses freed columns greedily", () => {
    const { placed } = layoutColumns([
      item("a", h(9), h(11)),
      item("b", h(9.5), h(10)),
      item("c", h(10), h(12)),
    ]);
    // b ends at 10, so c reuses its column.
    expect(columnsById(placed)).toEqual({ a: 0, b: 1, c: 1 });
    expect(placed.every((p) => p.columns === 2)).toBe(true);
  });

  it("sizes each overlap group independently", () => {
    const { placed } = layoutColumns([
      item("a", h(8), h(9)),
      item("b", h(8), h(9)),
      item("c", h(12), h(13)),
    ]);
    const byId = Object.fromEntries(placed.map((p) => [p.item.id, p.columns]));
    expect(byId).toEqual({ a: 2, b: 2, c: 1 });
  });

  it("places longer items first when they start together", () => {
    const { placed } = layoutColumns([item("short", h(9), h(10)), item("long", h(9), h(12))]);
    expect(columnsById(placed)).toEqual({ long: 0, short: 1 });
  });

  it("accepts up to four columns without overflow", () => {
    const items = ["a", "b", "c", "d"].map((id) => item(id, h(9), h(10)));
    const { placed, overflow } = layoutColumns(items);
    expect(placed).toHaveLength(4);
    expect(new Set(placed.map((p) => p.column))).toEqual(new Set([0, 1, 2, 3]));
    expect(overflow).toEqual([]);
  });

  it("collapses the rest into a +N marker when more than four overlap", () => {
    const items = ["a", "b", "c", "d", "e", "f"].map((id, i) => item(id, h(9), h(10) + i));
    const { placed, overflow } = layoutColumns(items);
    expect(placed).toHaveLength(3);
    expect(placed.every((p) => p.columns === 4 && p.column < 3)).toBe(true);
    expect(overflow).toHaveLength(1);
    expect(overflow[0].items).toHaveLength(3);
    expect(overflow[0].column).toBe(3);
    expect(overflow[0].columns).toBe(4);
    expect(overflow[0].start).toBe(h(9));
  });

  it("treats very short items as minDuration long", () => {
    const { placed } = layoutColumns([item("a", h(9), h(9)), item("b", h(9) + 5, h(10))]);
    expect(columnsById(placed)).toEqual({ a: 0, b: 1 });
  });
});

function occurrence(partial: Partial<EventOccurrence>): EventOccurrence {
  const date = partial.occurrenceDate ?? "2026-10-18";
  return {
    id: "e",
    title: "Evento",
    description: null,
    allDay: false,
    date,
    startAt: null,
    endAt: null,
    tz: null,
    color: null,
    recurrence: "none",
    recurrenceUntil: null,
    location: null,
    isPastLog: false,
    createdAt: "2026-10-18T00:00:00Z",
    updatedAt: "2026-10-18T00:00:00Z",
    occurrenceDate: date,
    key: `e:${date}`,
    isRecurring: false,
    ...partial,
  };
}

describe("day helpers", () => {
  const overnight = occurrence({
    startAt: "2026-10-18T22:00:00",
    endAt: "2026-10-19T02:00:00",
  });

  it("cuts timed events that cross midnight into one segment per day", () => {
    expect(timedSegmentsFor([overnight], "2026-10-18")).toMatchObject([
      { start: h(22), end: h(24) },
    ]);
    expect(timedSegmentsFor([overnight], "2026-10-19")).toMatchObject([{ start: 0, end: h(2) }]);
  });

  it("does not show an event ending exactly at midnight on the next day", () => {
    const untilMidnight = occurrence({
      startAt: "2026-10-18T20:00:00",
      endAt: "2026-10-19T00:00:00",
    });
    expect(occursOn(untilMidnight, "2026-10-19")).toBe(false);
    expect(occursOn(untilMidnight, "2026-10-18")).toBe(true);
  });

  it("groups occurrences by every day they touch inside the range", () => {
    const allDay = occurrence({ id: "x", allDay: true, occurrenceDate: "2026-10-19" });
    const grouped = groupByDay([overnight, allDay], "2026-10-18", "2026-10-19");
    expect(grouped.get("2026-10-18")?.map((o) => o.id)).toEqual(["e"]);
    expect(grouped.get("2026-10-19")?.map((o) => o.id)).toEqual(["e", "x"]);
  });
});
