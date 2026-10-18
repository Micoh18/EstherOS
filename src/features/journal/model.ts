import { z } from "zod";
import { dateISOSchema, optionalText, sqlBool, utcTimestampSchema } from "@/shared/db";

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
