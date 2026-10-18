import { z } from "zod";
import { dateISOSchema, optionalText, sqlBool, utcTimestampSchema } from "@/shared/db";
import { addDaysISO } from "@/shared/lib/dates";

export const MOODS = ["great", "good", "okay", "low", "bad"] as const;
export const MoodSchema = z.enum(MOODS);
export type Mood = z.infer<typeof MoodSchema>;

/** Empty Tiptap document, used when an entry is created without content. */
export const EMPTY_DOC_JSON = JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] });

export const JournalEntrySchema = z.object({
  id: z.string(),
  date: dateISOSchema,
  title: z.string().max(200).nullable(),
  /** Tiptap document as JSON text. */
  contentJson: z.string(),
  /** Plain text derived from the document, for search and previews. */
  contentText: z.string(),
  mood: MoodSchema.nullable(),
  isFavorite: z.boolean(),
  createdAt: utcTimestampSchema,
  updatedAt: utcTimestampSchema,
});
export type JournalEntry = z.infer<typeof JournalEntrySchema>;

export const JournalEntryRowSchema = z
  .object({
    id: z.string(),
    date: z.string(),
    title: z.string().nullable(),
    content_json: z.string(),
    content_text: z.string(),
    mood: MoodSchema.nullable().catch(null),
    is_favorite: sqlBool,
    created_at: z.string(),
    updated_at: z.string(),
  })
  .transform((row) => ({
    id: row.id,
    date: row.date,
    title: row.title,
    contentJson: row.content_json,
    contentText: row.content_text,
    mood: row.mood,
    isFavorite: row.is_favorite,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
  .pipe(JournalEntrySchema);

const contentJsonSchema = z.string().refine((value) => {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}, "contentJson must be valid JSON");

export const NewJournalEntrySchema = z.object({
  date: dateISOSchema,
  title: optionalText(200),
  contentJson: contentJsonSchema.default(EMPTY_DOC_JSON),
  contentText: z.string().default(""),
  mood: MoodSchema.nullish().transform((value) => value ?? null),
  isFavorite: z.boolean().default(false),
});
export type NewJournalEntry = z.input<typeof NewJournalEntrySchema>;
export type JournalEntryPatch = Partial<NewJournalEntry>;

export interface SearchOptions {
  /** Tag id. */
  tag?: string;
  favoritesOnly?: boolean;
}

export interface SearchHit {
  entry: JournalEntry;
  /** Text around the first match, with `…` where it was cut. */
  snippet: string;
}

export interface DayMood {
  date: string;
  /** Mood of the latest entry of the day that has one; `null` if none set it. */
  mood: Mood | null;
  entries: number;
}

// Pure rules -------------------------------------------------------------------

/** No text, no title and no mood: such entries are deleted when the user leaves them. */
export function isEntryEmpty(entry: Pick<JournalEntry, "title" | "contentText" | "mood">) {
  return !entry.title?.trim() && !entry.contentText.trim() && entry.mood === null;
}

/** Fragment of `text` around the first case-insensitive match of `query`. */
export function makeSnippet(text: string, query: string, radius = 60): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const index = clean.toLocaleLowerCase().indexOf(query.trim().toLocaleLowerCase());
  if (index < 0) return clean.slice(0, radius * 2) + (clean.length > radius * 2 ? "…" : "");
  const start = Math.max(0, index - radius);
  const end = Math.min(clean.length, index + query.trim().length + radius);
  return (start > 0 ? "…" : "") + clean.slice(start, end) + (end < clean.length ? "…" : "");
}

/** Tiptap JSON node, as stored in `contentJson`. */
export interface DocNode {
  type?: string;
  text?: string;
  content?: DocNode[];
}

/** Inline nodes of the journal schema; every other node is a block. */
const INLINE_NODES = new Set(["text", "hardBreak"]);

/**
 * Plain text of a Tiptap document, matching `editor.getText()`: a separator before every block
 * except the first one and a line break per hard break. Invalid JSON yields an empty string.
 */
export function contentToText(doc: DocNode | string, blockSeparator = "\n\n"): string {
  let root: DocNode;
  try {
    root = typeof doc === "string" ? (JSON.parse(doc) as DocNode) : doc;
  } catch {
    return "";
  }
  let text = "";
  let first = true;
  const walk = (node: DocNode) => {
    if (node.type === "text") text += node.text ?? "";
    else if (node.type === "hardBreak") text += "\n";
    else if (!INLINE_NODES.has(node.type ?? "")) {
      if (!first) text += blockSeparator;
      first = false;
    }
    node.content?.forEach(walk);
  };
  root.content?.forEach(walk);
  return text;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** First words of an entry for lists: the title if set, otherwise the start of the text. */
export function entryLabel(entry: Pick<JournalEntry, "title" | "contentText">, max = 60): string {
  const source = entry.title?.trim() || entry.contentText.replace(/\s+/g, " ").trim();
  return source.length > max ? `${source.slice(0, max).trimEnd()}…` : source;
}

export interface Streak {
  /** Consecutive days with at least one entry, ending today or yesterday. */
  days: number;
  writtenToday: boolean;
}

/**
 * Writing streak from the days that have entries. A streak that ended yesterday is still alive:
 * today has not finished yet.
 */
export function computeStreak(dates: readonly string[], today: string): Streak {
  const days = new Set(dates);
  const writtenToday = days.has(today);
  let cursor = writtenToday ? today : addDaysISO(today, -1);
  let count = 0;
  while (days.has(cursor)) {
    count += 1;
    cursor = addDaysISO(cursor, -1);
  }
  return { days: count, writtenToday };
}

/**
 * Document to load in the editor. Falls back to the plain text, one paragraph per line, when the
 * stored document is empty but `contentText` is not (entries imported or created without JSON).
 */
export function editorDocument(entry: Pick<JournalEntry, "contentJson" | "contentText">): string {
  if (contentToText(entry.contentJson).trim() || !entry.contentText.trim())
    return entry.contentJson;
  const paragraphs = entry.contentText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text) => ({ type: "paragraph", content: [{ type: "text", text }] }));
  return JSON.stringify({ type: "doc", content: paragraphs });
}
