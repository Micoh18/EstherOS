import { z } from "zod";
import { newId } from "@/shared/lib/ids";
import { emitDbChanged } from "./events";
import { execute, placeholders, select, selectOne, transaction } from "./query";
import { colorKeySchema } from "./schema";

/**
 * Tags are shared by events, journal entries and tasks, so they live in the shared db layer
 * instead of one feature. Each feature repository wraps the link helpers for its own entity.
 */

export const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: colorKeySchema.nullable().catch(null),
});
export type Tag = z.infer<typeof TagSchema>;

export const NewTagSchema = z.object({
  name: z.string().trim().min(1).max(50),
  color: colorKeySchema.nullish().transform((value) => value ?? null),
});
export type NewTag = z.input<typeof NewTagSchema>;

/** Bridge tables and their owner column. Fixed whitelist: names are interpolated into SQL. */
const LINKS = {
  event: { table: "event_tag", column: "event_id" },
  journal_entry: { table: "journal_tag", column: "entry_id" },
  task: { table: "task_tag", column: "task_id" },
} as const;
export type TagOwner = keyof typeof LINKS;

export function listTags(): Promise<Tag[]> {
  return select("SELECT id, name, color FROM tag ORDER BY name COLLATE NOCASE", [], TagSchema);
}

export function getTag(id: string): Promise<Tag | null> {
  return selectOne("SELECT id, name, color FROM tag WHERE id = ?", [id], TagSchema);
}

export function findTagByName(name: string): Promise<Tag | null> {
  return selectOne(
    "SELECT id, name, color FROM tag WHERE name = ? COLLATE NOCASE",
    [name.trim()],
    TagSchema,
  );
}

export async function createTag(input: NewTag): Promise<Tag> {
  const data = NewTagSchema.parse(input);
  const tag: Tag = { id: newId(), ...data };
  await execute("INSERT INTO tag (id, name, color) VALUES (?, ?, ?)", [
    tag.id,
    tag.name,
    tag.color,
  ]);
  emitDbChanged("tag");
  return tag;
}

/** Returns the tag with that name (case-insensitive), creating it if needed. */
export async function ensureTag(name: string): Promise<Tag> {
  return (await findTagByName(name)) ?? createTag({ name });
}

export async function updateTag(id: string, patch: Partial<NewTag>): Promise<Tag> {
  const current = await getTag(id);
  if (!current) throw new Error(`Tag not found: ${id}`);
  const data = NewTagSchema.parse({ ...current, ...patch });
  await execute("UPDATE tag SET name = ?, color = ? WHERE id = ?", [data.name, data.color, id]);
  emitDbChanged("tag");
  return { id, ...data };
}

export async function deleteTag(id: string): Promise<void> {
  await execute("DELETE FROM tag WHERE id = ?", [id]);
  emitDbChanged("tag");
}

export function listTagsFor(owner: TagOwner, ownerId: string): Promise<Tag[]> {
  const { table, column } = LINKS[owner];
  return select(
    `SELECT t.id, t.name, t.color FROM tag t JOIN ${table} l ON l.tag_id = t.id
     WHERE l.${column} = ? ORDER BY t.name COLLATE NOCASE`,
    [ownerId],
    TagSchema,
  );
}

/** Tags of many owners at once, keyed by owner id. */
export async function listTagsForMany(
  owner: TagOwner,
  ownerIds: string[],
): Promise<Map<string, Tag[]>> {
  const result = new Map<string, Tag[]>();
  if (ownerIds.length === 0) return result;
  const { table, column } = LINKS[owner];
  const rows = await select(
    `SELECT l.${column} AS owner_id, t.id, t.name, t.color FROM tag t
     JOIN ${table} l ON l.tag_id = t.id WHERE l.${column} IN (${placeholders(ownerIds.length)})
     ORDER BY t.name COLLATE NOCASE`,
    ownerIds,
    TagSchema.extend({ owner_id: z.string() }),
  );
  for (const { owner_id, ...tag } of rows) {
    result.set(owner_id, [...(result.get(owner_id) ?? []), tag]);
  }
  return result;
}

/** Replaces the tag set of one owner. */
export async function setTagsFor(
  owner: TagOwner,
  ownerId: string,
  tagIds: string[],
): Promise<void> {
  const { table, column } = LINKS[owner];
  const unique = [...new Set(tagIds)];
  await transaction((tx) => {
    tx.execute(`DELETE FROM ${table} WHERE ${column} = ?`, [ownerId]);
    for (const tagId of unique) {
      tx.execute(`INSERT INTO ${table} (${column}, tag_id) VALUES (?, ?)`, [ownerId, tagId]);
    }
  });
  emitDbChanged(owner);
}
