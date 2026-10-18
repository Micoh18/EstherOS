// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import {
  NewEventSchema,
  createEvent,
  deleteEvent,
  getEvent,
  listEventsForDate,
  listEventsInRange,
  moveEvent,
  updateEvent,
} from "@/features/calendar";
import { useMemoryDb } from "./helpers/memoryDb";

const TODAY = "2026-10-18";
const opts = { today: TODAY };
const dates = (occs: { occurrenceDate: string }[]) => occs.map((o) => o.occurrenceDate);

beforeEach(() => {
  useMemoryDb();
});

describe("events", () => {
  it("validates all-day and timed shapes", () => {
    expect(NewEventSchema.safeParse({ title: "x", allDay: true }).success).toBe(false);
    expect(
      NewEventSchema.safeParse({ title: "x", allDay: false, startAt: "2026-10-18T09:00:00" })
        .success,
    ).toBe(false);
    expect(NewEventSchema.safeParse({ title: "x", date: "2026-02-30" }).success).toBe(false);
  });

  it("end before start becomes start + 1 h; date derives from start", async () => {
    const event = await createEvent(
      {
        title: "Café",
        allDay: false,
        startAt: "2026-10-20T09:30:00",
        endAt: "2026-10-20T08:00:00",
      },
      TODAY,
    );
    expect(event.endAt).toBe("2026-10-20T10:30:00");
    expect(event.date).toBe("2026-10-20");
    expect(event.tz).toBeTruthy();
  });

  it("is_past_log defaults to true for past dates unless the caller says otherwise", async () => {
    const past = await createEvent({ title: "Paseo", date: "2026-10-01" }, TODAY);
    const future = await createEvent({ title: "Cumple", date: "2026-11-01" }, TODAY);
    const explicit = await createEvent(
      { title: "Plan", date: "2026-10-01", isPastLog: false },
      TODAY,
    );
    expect(past.isPastLog).toBe(true);
    expect(future.isPastLog).toBe(false);
    expect(explicit.isPastLog).toBe(false);
    expect((await getEvent(past.id))?.isPastLog).toBe(true);
  });

  it("weekly recurrence respects recurrence_until", async () => {
    await createEvent(
      { title: "Yoga", date: "2026-10-18", recurrence: "weekly", recurrenceUntil: "2026-11-08" },
      TODAY,
    );
    const occs = await listEventsInRange("2026-10-01", "2026-12-31", opts);
    expect(dates(occs)).toEqual(["2026-10-18", "2026-10-25", "2026-11-01", "2026-11-08"]);
  });

  it("a weekly event created today shows in the next 8 weeks", async () => {
    await createEvent({ title: "Clase", date: TODAY, recurrence: "weekly" }, TODAY);
    const occs = await listEventsInRange(TODAY, "2026-12-13", opts);
    expect(occs).toHaveLength(9);
  });

  it("monthly on the 31st clamps to the last day of shorter months", async () => {
    await createEvent({ title: "Pagar renta", date: "2026-01-31", recurrence: "monthly" }, TODAY);
    const occs = await listEventsInRange("2026-01-01", "2026-05-31", opts);
    expect(dates(occs)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
      "2026-05-31",
    ]);
  });

  it("series without until stop two years after today", async () => {
    await createEvent({ title: "Diario", date: "2026-10-01", recurrence: "daily" }, TODAY);
    expect(await listEventsForDate("2028-10-18", opts)).toHaveLength(1);
    expect(await listEventsForDate("2028-10-19", opts)).toHaveLength(0);
  });

  it("timed occurrences keep their time and duration", async () => {
    await createEvent(
      {
        title: "Lectura",
        allDay: false,
        startAt: "2026-10-18T21:00:00",
        endAt: "2026-10-18T22:30:00",
        recurrence: "daily",
      },
      TODAY,
    );
    const [occ] = await listEventsForDate("2026-10-21", opts);
    expect(occ.startAt).toBe("2026-10-21T21:00:00");
    expect(occ.endAt).toBe("2026-10-21T22:30:00");
    expect(occ.key).toMatch(/:2026-10-21$/);
  });

  it("yearly and ordering inside a day", async () => {
    await createEvent({ title: "Cumple", date: "2025-03-02", recurrence: "yearly" }, TODAY);
    await createEvent(
      {
        title: "Cita",
        allDay: false,
        startAt: "2027-03-02T10:00:00",
        endAt: "2027-03-02T11:00:00",
      },
      TODAY,
    );
    const occs = await listEventsForDate("2027-03-02", opts);
    expect(occs.map((o) => o.title)).toEqual(["Cumple", "Cita"]);
  });

  it("moveEvent moves the whole series", async () => {
    const event = await createEvent(
      { title: "Yoga", date: "2026-10-18", recurrence: "weekly", recurrenceUntil: "2026-11-08" },
      TODAY,
    );
    await moveEvent(event.id, "2026-10-26", "2026-10-25");
    const occs = await listEventsInRange("2026-10-01", "2026-12-31", opts);
    expect(dates(occs)).toEqual(["2026-10-19", "2026-10-26", "2026-11-02", "2026-11-09"]);
  });

  it("update and delete", async () => {
    const event = await createEvent({ title: "A", date: "2026-10-20" }, TODAY);
    const updated = await updateEvent(
      event.id,
      { allDay: false, startAt: "2026-10-21T08:00:00", endAt: "2026-10-21T09:00:00" },
      TODAY,
    );
    expect(updated.date).toBe("2026-10-21");
    await deleteEvent(event.id);
    expect(await getEvent(event.id)).toBeNull();
  });
});
