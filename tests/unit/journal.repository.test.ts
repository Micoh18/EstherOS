// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import {
  createEntry,
  datesWithEntriesInMonth,
  deleteIfEmpty,
  getEntry,
  listEntriesForDate,
  listEntriesForMonth,
  listEntryTags,
  search,
  setEntryTags,
  toggleFavorite,
  updateEntry,
} from "@/features/journal";
import { ensureTag } from "@/shared/db";
import { useMemoryDb } from "./helpers/memoryDb";

beforeEach(() => {
  useMemoryDb();
});

const text = (contentText: string) => ({
  contentText,
  contentJson: JSON.stringify({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: contentText }] }],
  }),
});

describe("journal", () => {
  it("search finds a word in three entries of different months, case-insensitively", async () => {
    await createEntry({ date: "2026-08-03", ...text("Hoy vi un Atardecer precioso") });
    await createEntry({ date: "2026-09-14", ...text("otro atardecer en la playa") });
    await createEntry({ date: "2026-10-01", ...text("El ATARDECER de octubre") });
    await createEntry({ date: "2026-10-02", ...text("Nada que ver") });

    const hits = await search("atardecer");

    expect(hits.map((h) => h.entry.date)).toEqual(["2026-10-01", "2026-09-14", "2026-08-03"]);
    expect(hits[0].snippet.toLowerCase()).toContain("atardecer");
  });

  it("search escapes LIKE wildcards and supports filters", async () => {
    const a = await createEntry({ date: "2026-10-01", ...text("100% feliz") });
    await createEntry({ date: "2026-10-02", ...text("1000 cosas") });
    expect((await search("100%")).map((h) => h.entry.id)).toEqual([a.id]);

    await toggleFavorite(a.id);
    expect(await search("", { favoritesOnly: true })).toHaveLength(1);

    const tag = await ensureTag("gratitud");
    await setEntryTags(a.id, [tag.id]);
    expect((await search("feliz", { tag: tag.id })).map((h) => h.entry.id)).toEqual([a.id]);
    expect(await search("cosas", { tag: tag.id })).toHaveLength(0);
    expect((await listEntryTags(a.id)).map((t) => t.name)).toEqual(["gratitud"]);
  });

  it("deleteIfEmpty only deletes entries without text, title and mood", async () => {
    const empty = await createEntry({ date: "2026-10-18", contentText: "  " });
    const withMood = await createEntry({ date: "2026-10-18", mood: "good" });
    const withText = await createEntry({ date: "2026-10-18", ...text("hola") });

    expect(await deleteIfEmpty(empty.id)).toBe(true);
    expect(await deleteIfEmpty(withMood.id)).toBe(false);
    expect(await deleteIfEmpty(withText.id)).toBe(false);
    expect(await getEntry(empty.id)).toBeNull();
    expect(await listEntriesForDate("2026-10-18")).toHaveLength(2);
  });

  it("month listing and day moods", async () => {
    await createEntry({ date: "2026-10-05", mood: "low", ...text("a") });
    const later = await createEntry({ date: "2026-10-05", ...text("b") });
    await createEntry({ date: "2026-10-20", mood: "great", ...text("c") });
    await createEntry({ date: "2026-11-01", mood: "bad", ...text("d") });
    await updateEntry(later.id, { mood: "good" });

    expect(await listEntriesForMonth("2026-10")).toHaveLength(3);
    const days = await datesWithEntriesInMonth("2026-10");
    expect(days.map((d) => d.date)).toEqual(["2026-10-05", "2026-10-20"]);
    expect(days[0].entries).toBe(2);
    expect(["good", "low"]).toContain(days[0].mood);
    expect(days[1].mood).toBe("great");
  });

  it("rejects invalid input", async () => {
    await expect(createEntry({ date: "2026-13-01" })).rejects.toThrow();
    await expect(createEntry({ date: "2026-10-01", contentJson: "{oops" })).rejects.toThrow();
  });
});
