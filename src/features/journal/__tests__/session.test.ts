// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ensureTag } from "@/shared/db";
import { useMemoryDb, type MemoryDb } from "./memoryDb";
import {
  createEntry,
  datesWithEntriesInMonth,
  findAdjacentEntry,
  getEntry,
  listEntriesForMonth,
  listEntryDates,
  listEntryTags,
  search,
  DRAFT_CREATED_AT,
} from "../repository";
import { createEntryController } from "../session";

let db: MemoryDb;
const count = () =>
  (db.raw.prepare("SELECT COUNT(*) AS n FROM journal_entry").get() as { n: number }).n;
const doc = (text: string) =>
  JSON.stringify({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  });

beforeEach(() => {
  db = useMemoryDb();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("entry session", () => {
  it("does not create a row for an untouched or still empty draft", async () => {
    const entry = createEntryController({ date: "2026-10-18", initial: null });
    await entry.flush();
    entry.change({ title: "   ", contentText: "\n\n" });
    await vi.advanceTimersByTimeAsync(1000);
    await entry.leave();
    expect(count()).toBe(0);
  });

  it("persists the draft 800 ms after the first text, then updates the same row", async () => {
    const persisted = vi.fn();
    const entry = createEntryController({
      date: "2026-10-18",
      initial: null,
      onPersisted: persisted,
    });
    entry.change({ contentJson: doc("Hola"), contentText: "Hola" });
    await vi.advanceTimersByTimeAsync(799);
    expect(count()).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(count()).toBe(1);
    expect(persisted).toHaveBeenCalledWith(entry.id);

    entry.change({ contentJson: doc("Hola diario"), contentText: "Hola diario" });
    await vi.advanceTimersByTimeAsync(800);
    expect(count()).toBe(1);
    const saved = await getEntry(entry.id!);
    expect(saved?.contentText).toBe("Hola diario");
    expect(JSON.parse(saved!.contentJson)).toEqual(JSON.parse(doc("Hola diario")));
  });

  it("a mood alone is enough to keep the entry and is saved right away", async () => {
    const entry = createEntryController({ date: "2026-10-18", initial: null });
    entry.change({ mood: "great" }, true);
    await vi.advanceTimersByTimeAsync(0);
    expect((await getEntry(entry.id!))?.mood).toBe("great");
    const [day] = await datesWithEntriesInMonth("2026-10");
    expect(day).toMatchObject({ date: "2026-10-18", mood: "great" });
  });

  it("deletes an entry that ended up empty when leaving it", async () => {
    const saved = await createEntry({
      date: "2026-10-18",
      contentJson: doc("x"),
      contentText: "x",
    });
    const entry = createEntryController({ date: saved.date, initial: saved });
    entry.change({ contentJson: doc(""), contentText: "" });
    await entry.leave();
    expect(count()).toBe(0);
  });

  it("keeps a non-empty entry when leaving it", async () => {
    const saved = await createEntry({
      date: "2026-10-18",
      contentJson: doc("x"),
      contentText: "x",
    });
    const entry = createEntryController({ date: saved.date, initial: saved });
    await entry.leave();
    expect(count()).toBe(1);
  });

  it("saves draft tags together with the entry", async () => {
    const tag = await ensureTag("viajes");
    const entry = createEntryController({ date: "2026-10-18", initial: null });
    entry.change({ tagIds: [tag.id] }, true);
    await vi.advanceTimersByTimeAsync(0);
    expect(count()).toBe(0);
    entry.change({ contentText: "playa", contentJson: doc("playa") }, true);
    await vi.advanceTimersByTimeAsync(0);
    expect((await listEntryTags(entry.id!)).map((t) => t.name)).toEqual(["viajes"]);
    expect((await search("", { tag: tag.id })).length).toBe(1);
  });

  it("remove deletes the row and ignores later changes", async () => {
    const entry = createEntryController({ date: "2026-10-18", initial: null });
    entry.change({ contentText: "a", contentJson: doc("a") }, true);
    await vi.advanceTimersByTimeAsync(0);
    expect(count()).toBe(1);
    await entry.remove();
    entry.change({ contentText: "b", contentJson: doc("b") });
    await vi.advanceTimersByTimeAsync(2000);
    expect(count()).toBe(0);
    expect(await listEntriesForMonth("2026-10")).toEqual([]);
  });

  it("favorites are filtered by search", async () => {
    const a = createEntryController({ date: "2026-10-17", initial: null });
    a.change({ contentText: "uno", contentJson: doc("uno"), isFavorite: true }, true);
    const b = createEntryController({ date: "2026-10-18", initial: null });
    b.change({ contentText: "dos", contentJson: doc("dos") }, true);
    await vi.advanceTimersByTimeAsync(0);
    const hits = await search("", { favoritesOnly: true });
    expect(hits.map((h) => h.entry.contentText)).toEqual(["uno"]);
  });

  it("duplicates the saved entry", async () => {
    const entry = createEntryController({ date: "2026-10-18", initial: null });
    expect(await entry.duplicate()).toBeNull();
    entry.change({ contentText: "a", contentJson: doc("a"), isFavorite: true });
    const copy = await entry.duplicate();
    expect(copy).toMatchObject({ date: "2026-10-18", contentText: "a", isFavorite: false });
    expect(count()).toBe(2);
  });
});

describe("repository additions", () => {
  it("lists distinct entry dates newest first", async () => {
    await createEntry({ date: "2026-10-01", contentText: "a" });
    await createEntry({ date: "2026-10-03", contentText: "b" });
    await createEntry({ date: "2026-10-03", contentText: "c" });
    expect(await listEntryDates()).toEqual(["2026-10-03", "2026-10-01"]);
  });

  it("finds adjacent entries in chronological order", async () => {
    vi.setSystemTime(new Date("2026-10-18T10:00:00Z"));
    const first = await createEntry({ date: "2026-10-01", contentText: "a" });
    const morning = await createEntry({ date: "2026-10-03", contentText: "b" });
    vi.setSystemTime(new Date("2026-10-18T11:00:00Z"));
    const evening = await createEntry({ date: "2026-10-03", contentText: "c" });

    expect((await findAdjacentEntry(morning.date, morning.createdAt, "next"))?.id).toBe(evening.id);
    expect((await findAdjacentEntry(morning.date, morning.createdAt, "prev"))?.id).toBe(first.id);
    expect(await findAdjacentEntry(first.date, first.createdAt, "prev")).toBeNull();
    // A draft counts as the newest entry of its day.
    expect((await findAdjacentEntry("2026-10-03", DRAFT_CREATED_AT, "prev"))?.id).toBe(evening.id);
  });
});
