import { z } from "zod";
import {
  dateISOSchema,
  emitDbChanged,
  escapeLike,
  execute,
  listTagsFor,
  select,
  selectOne,
  setTagsFor,
  toSqlBool,
  type SqlValue,
  type Tag,
} from "@/shared/db";
import { monthRange, nowUTC, type DateISO, type YearMonth } from "@/shared/lib/dates";
import { newId } from "@/shared/lib/ids";
import {
  JournalEntryRowSchema,
  JournalEntrySchema,
  NewJournalEntrySchema,
  isEntryEmpty,
  makeSnippet,
  type DayMood,
  type JournalEntry,
  type JournalEntryPatch,
  type NewJournalEntry,
  type SearchHit,
  type SearchOptions,
} from "./model";

const COLUMNS =
  "e.id, e.date, e.title, e.content_json, e.content_text, e.mood, e.is_favorite, " +
  "e.created_at, e.updated_at";
const ORDER = "ORDER BY e.date DESC, e.created_at DESC";

export function getEntry(id: string): Promise<JournalEntry | null> {
  return selectOne(
    `SELECT ${COLUMNS} FROM journal_entry e WHERE e.id = ?`,
    [id],
    JournalEntryRowSchema,
  );
}

async function requireEntry(id: string): Promise<JournalEntry> {
  const entry = await getEntry(id);
  if (!entry) throw new Error(`Journal entry not found: ${id}`);
  return entry;
}

/** Persists a new entry. Callers create it only once the user has written something. */
export async function createEntry(input: NewJournalEntry): Promise<JournalEntry> {
  const data = NewJournalEntrySchema.parse(input);
  const now = nowUTC();
  const entry: JournalEntry = { id: newId(), ...data, createdAt: now, updatedAt: now };
  await execute(
    `INSERT INTO journal_entry (id, date, title, content_json, content_text, mood, is_favorite,
       created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.id,
      entry.date,
      entry.title,
      entry.contentJson,
      entry.contentText,
      entry.mood,
      toSqlBool(entry.isFavorite),
      now,
      now,
    ],
  );
  emitDbChanged("journal_entry");
  return entry;
}

/** Autosave target: merge `patch` into the entry. `contentText` must come with `contentJson`. */
export async function updateEntry(id: string, patch: JournalEntryPatch): Promise<JournalEntry> {
  const current = await requireEntry(id);
  const data = NewJournalEntrySchema.parse({ ...current, ...patch });
  const next = JournalEntrySchema.parse({ ...current, ...data, updatedAt: nowUTC() });
  await execute(
    `UPDATE journal_entry SET date = ?, title = ?, content_json = ?, content_text = ?, mood = ?,
       is_favorite = ?, updated_at = ? WHERE id = ?`,
    [
      next.date,
      next.title,
      next.contentJson,
      next.contentText,
      next.mood,
      toSqlBool(next.isFavorite),
      next.updatedAt,
      id,
    ],
  );
  emitDbChanged("journal_entry");
  return next;
}

export async function deleteEntry(id: string): Promise<void> {
  await execute("DELETE FROM journal_entry WHERE id = ?", [id]);
  emitDbChanged("journal_entry");
}

/** Deletes the entry if it has no text, title or mood. Returns whether it was deleted. */
export async function deleteIfEmpty(id: string): Promise<boolean> {
  const entry = await getEntry(id);
  if (!entry || !isEntryEmpty(entry)) return false;
  await deleteEntry(id);
  return true;
}

export async function toggleFavorite(id: string): Promise<JournalEntry> {
  const entry = await requireEntry(id);
  return updateEntry(id, { isFavorite: !entry.isFavorite });
}

/** Entries of a day, oldest first (several entries per day are grouped by creation time). */
export function listEntriesForDate(date: DateISO): Promise<JournalEntry[]> {
  return select(
    `SELECT ${COLUMNS} FROM journal_entry e WHERE e.date = ? ORDER BY e.created_at`,
    [date],
    JournalEntryRowSchema,
  );
}

/** Entries of a `YYYY-MM` month, newest day first. */
export function listEntriesForMonth(month: YearMonth): Promise<JournalEntry[]> {
  const { from, to } = monthRange(month);
  return select(
    `SELECT ${COLUMNS} FROM journal_entry e WHERE e.date BETWEEN ? AND ? ${ORDER}`,
    [from, to],
    JournalEntryRowSchema,
  );
}

export function listFavorites(): Promise<JournalEntry[]> {
  return select(
    `SELECT ${COLUMNS} FROM journal_entry e WHERE e.is_favorite = 1 ${ORDER}`,
    [],
    JournalEntryRowSchema,
  );
}

/** Days of the month that have entries, with the mood to paint on the mini calendar. */
export async function datesWithEntriesInMonth(month: YearMonth): Promise<DayMood[]> {
  const entries = await listEntriesForMonth(month);
  const byDate = new Map<string, DayMood>();
  // Entries arrive newest first per day, so the first mood seen is the latest one.
  for (const entry of entries) {
    const day = byDate.get(entry.date) ?? { date: entry.date, mood: null, entries: 0 };
    day.entries += 1;
    day.mood ??= entry.mood;
    byDate.set(entry.date, day);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Case-insensitive search over text and title (SQLite LIKE folds ASCII case only).
 * Empty queries return nothing unless a filter is set.
 */
export async function search(query: string, options: SearchOptions = {}): Promise<SearchHit[]> {
  const q = query.trim();
  if (!q && !options.tag && !options.favoritesOnly) return [];
  const where: string[] = [];
  const params: SqlValue[] = [];
  let join = "";
  if (q) {
    const pattern = `%${escapeLike(q)}%`;
    where.push("(e.content_text LIKE ? ESCAPE '\\' OR e.title LIKE ? ESCAPE '\\')");
    params.push(pattern, pattern);
  }
  if (options.tag) {
    join = "JOIN journal_tag jt ON jt.entry_id = e.id AND jt.tag_id = ?";
    params.unshift(options.tag);
  }
  if (options.favoritesOnly) where.push("e.is_favorite = 1");
  const entries = await select(
    `SELECT ${COLUMNS} FROM journal_entry e ${join}` +
      (where.length ? ` WHERE ${where.join(" AND ")}` : "") +
      ` ${ORDER}`,
    params,
    JournalEntryRowSchema,
  );
  return entries.map((entry) => ({ entry, snippet: makeSnippet(entry.contentText, q) }));
}

export function listEntryTags(entryId: string): Promise<Tag[]> {
  return listTagsFor("journal_entry", entryId);
}

export function setEntryTags(entryId: string, tagIds: string[]): Promise<void> {
  return setTagsFor("journal_entry", entryId, tagIds);
}

const EntryDateRowSchema = z.object({ date: dateISOSchema });

/** Distinct days with entries, newest first (writing streak). */
export async function listEntryDates(): Promise<DateISO[]> {
  const rows = await select(
    "SELECT DISTINCT date FROM journal_entry ORDER BY date DESC",
    [],
    EntryDateRowSchema,
  );
  return rows.map((row) => row.date);
}

/** Sorts after every real `created_at`: a draft is always the newest entry of its day. */
export const DRAFT_CREATED_AT = "9999-12-31T23:59:59Z";

/**
 * Entry just before (`prev`) or after (`next`) a position in the chronological order
 * (date, then creation time). Use `DRAFT_CREATED_AT` for an unsaved entry.
 */
export function findAdjacentEntry(
  date: DateISO,
  createdAt: string,
  direction: "prev" | "next",
): Promise<JournalEntry | null> {
  const [cmp, order] = direction === "prev" ? ["<", "DESC"] : [">", "ASC"];
  return selectOne(
    `SELECT ${COLUMNS} FROM journal_entry e
     WHERE e.date ${cmp} ? OR (e.date = ? AND e.created_at ${cmp} ?)
     ORDER BY e.date ${order}, e.created_at ${order} LIMIT 1`,
    [date, date, createdAt],
    JournalEntryRowSchema,
  );
}

/** Copy of an entry (same day, content, mood and tags), not marked as favorite. */
export async function duplicateEntry(id: string): Promise<JournalEntry> {
  const source = await requireEntry(id);
  const copy = await createEntry({
    date: source.date,
    title: source.title,
    contentJson: source.contentJson,
    contentText: source.contentText,
    mood: source.mood,
  });
  const tags = await listEntryTags(id);
  if (tags.length > 0)
    await setEntryTags(
      copy.id,
      tags.map((tag) => tag.id),
    );
  return copy;
}
