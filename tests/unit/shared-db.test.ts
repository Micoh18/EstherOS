// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { emitDbChanged, escapeLike, onDbChanged, select, transaction } from "@/shared/db";
import {
  addDaysISO,
  isValidDateISO,
  monthGridRange,
  monthRange,
  nowUTC,
  parseDateISO,
  parseLocalDateTime,
  startOfWeekFor,
  toDateISO,
  toLocalDateTimeISO,
  weekRange,
} from "@/shared/lib/dates";
import { useMemoryDb, type MemoryDb } from "./helpers/memoryDb";

let db: MemoryDb;

beforeEach(() => {
  db = useMemoryDb();
});

describe("query layer", () => {
  it("drops rows that fail validation", async () => {
    db.raw.prepare("INSERT INTO tag (id, name) VALUES ('a', 'uno'), ('b', 'dos')").run();
    const rows = await select(
      "SELECT id, name FROM tag ORDER BY name",
      [],
      z.object({ id: z.string(), name: z.literal("uno") }),
    );
    expect(rows).toEqual([{ id: "a", name: "uno" }]);
  });

  it("transaction is atomic", async () => {
    await expect(
      transaction((tx) => {
        tx.execute("INSERT INTO tag (id, name) VALUES (?, ?)", ["a", "uno"]);
        tx.execute("INSERT INTO tag (id, name) VALUES (?, ?)", ["b", "UNO"]);
      }),
    ).rejects.toThrow();
    expect(db.raw.prepare("SELECT COUNT(*) AS n FROM tag").get()).toEqual({ n: 0 });
  });

  it("escapeLike", () => {
    expect(escapeLike("50%_a\\b")).toBe("50\\%\\_a\\\\b");
  });

  it("change events reach table and wildcard subscribers", () => {
    const onTask = vi.fn();
    const onAll = vi.fn();
    const offTask = onDbChanged("task", onTask);
    onDbChanged("*", onAll);
    emitDbChanged("task");
    emitDbChanged("event");
    emitDbChanged("*");
    expect(onTask).toHaveBeenCalledTimes(2);
    expect(onAll).toHaveBeenCalledTimes(3);
    offTask();
    emitDbChanged("task");
    expect(onTask).toHaveBeenCalledTimes(2);
  });
});

describe("dates", () => {
  it("round-trips local dates without time zone drift", () => {
    expect(toDateISO(parseDateISO("2026-03-29"))).toBe("2026-03-29");
    expect(toLocalDateTimeISO(parseLocalDateTime("2026-10-18T09:30:00"))).toBe(
      "2026-10-18T09:30:00",
    );
    expect(() => parseDateISO("2026-02-30")).toThrow();
    expect(isValidDateISO("2026-1-01")).toBe(false);
    expect(addDaysISO("2026-12-31", 1)).toBe("2027-01-01");
    expect(nowUTC(new Date(Date.UTC(2026, 9, 18, 14, 28, 0, 123)))).toBe("2026-10-18T14:28:00Z");
  });

  it("week and month ranges", () => {
    const sunday = parseDateISO("2026-10-18");
    expect(toDateISO(startOfWeekFor(sunday, 1))).toBe("2026-10-12");
    expect(toDateISO(startOfWeekFor(sunday, 0))).toBe("2026-10-18");
    expect(weekRange(sunday, 1)).toEqual({ from: "2026-10-12", to: "2026-10-18" });
    expect(monthRange("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(monthGridRange("2026-10", 1)).toEqual({ from: "2026-09-28", to: "2026-11-01" });
  });
});
