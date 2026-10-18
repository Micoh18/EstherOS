import type { DateISO } from "@/shared/lib/dates";
import { createAutosaver, type SaveStatus } from "./autosave";
import { EMPTY_DOC_JSON, isEntryEmpty, type JournalEntry, type Mood } from "./model";
import {
  createEntry,
  deleteEntry,
  deleteIfEmpty,
  duplicateEntry,
  getEntry,
  setEntryTags,
  updateEntry,
} from "./repository";

/** What the editor holds for one entry; saved as a whole on each autosave. */
export interface EntryFields {
  title: string;
  contentJson: string;
  contentText: string;
  mood: Mood | null;
  isFavorite: boolean;
  tagIds: string[];
}

export interface EntryControllerOptions {
  date: DateISO;
  /** Saved entry being edited, or `null` for a new in-memory draft. */
  initial: JournalEntry | null;
  initialTagIds?: string[];
  onStatus?: (status: SaveStatus) => void;
  /** The draft was saved for the first time. */
  onPersisted?: (id: string) => void;
  delay?: number;
  retryDelay?: number;
}

export interface EntryController {
  readonly id: string | null;
  readonly fields: EntryFields;
  /** Applies a change and schedules the autosave (`immediate` saves right away). */
  change: (patch: Partial<EntryFields>, immediate?: boolean) => void;
  flush: () => Promise<boolean>;
  /** Leaving the entry: saves pending changes, then deletes the entry if it ended up empty. */
  leave: () => Promise<void>;
  /** Deletes the entry (or discards the draft); later changes are ignored. */
  remove: () => Promise<void>;
  /** Saves and copies the entry. `null` while it is an unsaved draft. */
  duplicate: () => Promise<JournalEntry | null>;
}

const sameIds = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id, index) => id === b[index]);

/**
 * Editing session of one journal entry, independent of React. A draft is not written to the
 * database until it has text, a title or a mood; from then on every change is autosaved.
 */
export function createEntryController({
  date,
  initial,
  initialTagIds = [],
  onStatus,
  onPersisted,
  delay,
  retryDelay,
}: EntryControllerOptions): EntryController {
  let fields: EntryFields = {
    title: initial?.title ?? "",
    contentJson: initial?.contentJson ?? EMPTY_DOC_JSON,
    contentText: initial?.contentText ?? "",
    mood: initial?.mood ?? null,
    isFavorite: initial?.isFavorite ?? false,
    tagIds: [...initialTagIds],
  };
  let id: string | null = initial?.id ?? null;
  let savedTagIds = [...initialTagIds];
  let removed = false;

  async function save() {
    const snapshot = fields;
    const { tagIds, ...data } = snapshot;
    // Deleted elsewhere (or emptied and dropped by an earlier leave): save it again as new.
    if (id && !(await getEntry(id))) id = null;
    if (!id) {
      if (isEntryEmpty({ ...data, title: data.title || null })) return;
      const created = await createEntry({ date, ...data });
      id = created.id;
      savedTagIds = [];
      onPersisted?.(created.id);
    } else {
      await updateEntry(id, data);
    }
    if (!sameIds(tagIds, savedTagIds)) {
      await setEntryTags(id, tagIds);
      savedTagIds = tagIds;
    }
  }

  const saver = createAutosaver({ save, onStatus, delay, retryDelay });

  return {
    get id() {
      return id;
    },
    get fields() {
      return fields;
    },
    change(patch, immediate = false) {
      if (removed) return;
      fields = { ...fields, ...patch };
      saver.touch();
      if (immediate) void saver.flush();
    },
    flush: () => saver.flush(),
    async leave() {
      if (removed) return;
      await saver.flush();
      if (id && (await deleteIfEmpty(id))) id = null;
    },
    async remove() {
      removed = true;
      saver.cancel();
      if (id) await deleteEntry(id);
      id = null;
    },
    async duplicate() {
      await saver.flush();
      return id ? duplicateEntry(id) : null;
    },
  };
}
