import { useEffect, useRef, useState } from "react";
import { getSetting } from "@/features/settings";
import { listTags, onDbChanged, type DbTable, type Tag } from "@/shared/db";
import { todayISO, type DateISO, type YearMonth } from "@/shared/lib/dates";
import { log } from "@/shared/lib/log";
import {
  computeStreak,
  type DayMood,
  type JournalEntry,
  type SearchHit,
  type Streak,
} from "./model";
import {
  datesWithEntriesInMonth,
  findAdjacentEntry,
  listEntriesForDate,
  listEntriesForMonth,
  listEntryDates,
  search,
  DRAFT_CREATED_AT,
} from "./repository";
import { showDraft, showEntry, useJournalStore } from "./store";

export interface DbQuery<T> {
  data: T;
  loading: boolean;
}

const ENTRY_TABLES: readonly DbTable[] = ["journal_entry"];

/**
 * Runs `fetcher` when `key` changes and again whenever one of `tables` changes (`db:changed`).
 * Keeps the previous data while reloading, so lists do not flash.
 */
export function useDbQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  initial: T,
  tables: readonly DbTable[] = ENTRY_TABLES,
): DbQuery<T> {
  const [state, setState] = useState<{ key: string | null; data: T }>({ key: null, data: initial });
  const [version, setVersion] = useState(0);
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const tablesKey = tables.join(",");
  useEffect(() => {
    const offs = tablesKey
      .split(",")
      .map((table) => onDbChanged(table as DbTable, () => setVersion((v) => v + 1)));
    return () => offs.forEach((off) => off());
  }, [tablesKey]);

  useEffect(() => {
    let cancelled = false;
    fetcherRef.current().then(
      (data) => {
        if (!cancelled) setState({ key, data });
      },
      (error: unknown) => {
        log.error("journal query failed", key, error);
        if (!cancelled) setState((current) => ({ ...current, key }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key, version]);

  return { data: state.data, loading: state.key !== key };
}

const NO_ENTRIES: JournalEntry[] = [];
const NO_MOODS: DayMood[] = [];
const NO_HITS: SearchHit[] = [];
const NO_TAGS: Tag[] = [];

/** Entries of one day, oldest first. Public: used by Hoy and the calendar day panel. */
export function useJournalEntriesForDate(date: DateISO): DbQuery<JournalEntry[]> {
  return useDbQuery(`date:${date}`, () => listEntriesForDate(date), NO_ENTRIES);
}

/** Entries of a month, newest day first. */
export function useJournalMonth(month: YearMonth): DbQuery<JournalEntry[]> {
  return useDbQuery(`month:${month}`, () => listEntriesForMonth(month), NO_ENTRIES);
}

/** Days of a month with entries and the mood to paint (mini calendar, main calendar). */
export function useJournalDayMoods(month: YearMonth): DbQuery<DayMood[]> {
  return useDbQuery(`moods:${month}`, () => datesWithEntriesInMonth(month), NO_MOODS);
}

export interface JournalSearch {
  query: string;
  tag: string | null;
  favoritesOnly: boolean;
}

export const isSearchActive = (s: JournalSearch) =>
  s.query.trim() !== "" || s.tag !== null || s.favoritesOnly;

const SEARCH_TABLES: readonly DbTable[] = ["journal_entry", "tag"];

export function useJournalSearch(s: JournalSearch): DbQuery<SearchHit[]> {
  const key = `search:${s.query.trim()}|${s.tag ?? ""}|${s.favoritesOnly}`;
  return useDbQuery(
    key,
    () => search(s.query, { tag: s.tag ?? undefined, favoritesOnly: s.favoritesOnly }),
    NO_HITS,
    SEARCH_TABLES,
  );
}

const TAG_TABLES: readonly DbTable[] = ["tag", "journal_entry"];

export function useAllTags(): DbQuery<Tag[]> {
  return useDbQuery("tags", listTags, NO_TAGS, TAG_TABLES);
}

/** Consecutive days with entries, ending today (or yesterday while today is still blank). */
export function useJournalStreak(): DbQuery<Streak> & Streak {
  const today = todayISO();
  const query = useDbQuery(
    `streak:${today}`,
    async () => computeStreak(await listEntryDates(), today),
    { days: 0, writtenToday: false },
  );
  return { ...query, ...query.data };
}

const SETTING_TABLES: readonly DbTable[] = ["setting"];

/** `week_starts_on` reduced to what the month grid supports (Sunday or Monday). */
export function useWeekStartsOn(): 0 | 1 {
  const { data } = useDbQuery(
    "week_starts_on",
    async () => ((await getSetting("week_starts_on")) === 0 ? 0 : 1) as 0 | 1,
    1 as 0 | 1,
    SETTING_TABLES,
  );
  return data;
}

// Navigation ---------------------------------------------------------------------------------

/** Opens the latest entry of `date`, or a fresh draft if the day has none. */
export async function openJournalDate(date: DateISO): Promise<void> {
  try {
    const entries = await listEntriesForDate(date);
    const latest = entries.at(-1);
    if (latest) showEntry(latest);
    else showDraft(date);
  } catch (error) {
    log.error("could not open journal day", date, error);
    showDraft(date);
  }
}

/** Moves to the previous or next entry in chronological order. Returns false at the ends. */
export async function openAdjacentEntry(direction: "prev" | "next"): Promise<boolean> {
  const active = useJournalStore.getState().active;
  if (!active) return false;
  let createdAt = DRAFT_CREATED_AT;
  if (active.entryId) {
    const entries = await listEntriesForDate(active.date);
    createdAt = entries.find((entry) => entry.id === active.entryId)?.createdAt ?? createdAt;
  }
  const target = await findAdjacentEntry(active.date, createdAt, direction);
  if (!target) return false;
  showEntry(target);
  return true;
}
