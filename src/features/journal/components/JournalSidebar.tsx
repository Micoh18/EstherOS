import { useEffect, useMemo, useState, type KeyboardEvent, type Ref } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { t } from "@/shared/i18n";
import { Heart, Search, X } from "@/shared/icons";
import { parseDateISO } from "@/shared/lib/dates";
import { Chip, EmptyState, Select, cn } from "@/shared/ui";
import {
  isSearchActive,
  useAllTags,
  useJournalMonth,
  useJournalSearch,
  type JournalSearch,
} from "../hooks";
import { entryLabel, type JournalEntry, type SearchHit } from "../model";
import { showEntry, useJournalStore } from "../store";
import { Highlight } from "./Highlight";
import { JournalMiniCalendar } from "./JournalMiniCalendar";
import { MoodDot } from "./MoodDot";

export const SEARCH_DEBOUNCE_MS = 300;
const ALL_TAGS = "__all";

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const dayLabel = (date: string) => capitalize(format(parseDateISO(date), "EEE d", { locale: es }));
const fullDayLabel = (date: string) => format(parseDateISO(date), "d MMM yyyy", { locale: es });
const timeLabel = (entry: JournalEntry) => format(parseISO(entry.createdAt), "HH:mm");

interface JournalSidebarProps {
  searchRef?: Ref<HTMLInputElement>;
}

/** Left column: search with filters, mini calendar and the month's (or the search's) entries. */
export function JournalSidebar({ searchRef }: JournalSidebarProps) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const { data: tags } = useAllTags();

  useEffect(() => {
    const timer = setTimeout(() => setQuery(input), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  const searchState: JournalSearch = { query, tag, favoritesOnly };
  const searching = isSearchActive(searchState);

  const clearSearch = () => {
    setInput("");
    setQuery("");
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" && input) {
      // Consumed here: Escape clears the search instead of closing anything else.
      event.preventDefault();
      clearSearch();
    }
  };

  const tagOptions = [
    { value: ALL_TAGS, label: t("journal.filter.allTags") },
    ...tags.map((item) => ({ value: item.id, label: item.name })),
  ];

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-col gap-2">
        <label className="relative block">
          <span className="sr-only">{t("journal.search.label")}</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-faint"
          />
          <input
            ref={searchRef}
            type="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder={t("journal.search.placeholder")}
            className={cn(
              "h-[36px] w-full rounded-full border border-border bg-surface pr-8 pl-9 text-sm text-text outline-none",
              "transition-[border-color,box-shadow] duration-(--dur-fast) ease-(--ease-soft) placeholder:text-text-faint",
              "focus-visible:border-accent focus-visible:shadow-(--shadow-glow) [&::-webkit-search-cancel-button]:hidden",
            )}
          />
          {input ? (
            <button
              type="button"
              aria-label={t("journal.search.clear")}
              onClick={clearSearch}
              className="absolute top-1/2 right-2 inline-flex size-[22px] -translate-y-1/2 items-center justify-center rounded-full text-text-muted outline-none hover:bg-surface-hover focus-visible:shadow-(--shadow-glow) [&_svg]:size-[14px]"
            >
              <X aria-hidden />
            </button>
          ) : null}
        </label>
        <div className="flex items-center gap-2">
          <Select
            size="sm"
            options={tagOptions}
            value={tag ?? ALL_TAGS}
            onValueChange={(value) => setTag(value === ALL_TAGS ? null : value)}
            aria-label={t("journal.filter.tag")}
            className="min-w-0 flex-1"
          />
          <Chip
            size="md"
            color="accent"
            selected={favoritesOnly}
            onClick={() => setFavoritesOnly((value) => !value)}
            icon={<Heart size={14} filled={favoritesOnly} />}
          >
            {t("journal.filter.favorites")}
          </Chip>
        </div>
      </div>

      <JournalMiniCalendar />

      <div className="-mx-2 min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {searching ? <SearchResults search={searchState} /> : <MonthEntries />}
      </div>
    </div>
  );
}

function useActiveEntryId() {
  return useJournalStore((state) => state.active?.entryId ?? null);
}

const rowClass = (active: boolean) =>
  cn(
    "flex w-full items-start gap-2 rounded-md px-3 py-2 text-left outline-none",
    "transition-colors duration-(--dur-fast) ease-(--ease-soft) focus-visible:shadow-(--shadow-glow)",
    active ? "bg-accent-soft" : "hover:bg-surface-hover",
  );

function MonthEntries() {
  const visibleMonth = useJournalStore((state) => state.visibleMonth);
  const activeId = useActiveEntryId();
  const { data: entries, loading } = useJournalMonth(visibleMonth);

  const groups = useMemo(() => {
    const byDate = new Map<string, JournalEntry[]>();
    for (const entry of entries) byDate.set(entry.date, [...(byDate.get(entry.date) ?? []), entry]);
    return [...byDate.entries()];
  }, [entries]);

  if (!loading && entries.length === 0) {
    return <EmptyState size="sm" title={t("journal.list.emptyMonth")} />;
  }

  return (
    <section aria-label={t("journal.list.month")} className="flex flex-col gap-2">
      {groups.map(([date, dayEntries]) => (
        <div key={date} className="flex flex-col gap-0.5">
          <h3 className="px-3 pt-1 text-xs font-semibold tracking-wide text-text-muted">
            {dayLabel(date)}
          </h3>
          <ul className="flex flex-col gap-0.5">
            {dayEntries.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => showEntry(entry)}
                  aria-current={entry.id === activeId ? "true" : undefined}
                  className={rowClass(entry.id === activeId)}
                >
                  <span className="mt-[7px]">
                    <MoodDot mood={entry.mood} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-text">
                    {entryLabel(entry) || t("journal.list.untitled")}
                  </span>
                  {dayEntries.length > 1 ? (
                    <span className="shrink-0 text-xs text-text-faint">{timeLabel(entry)}</span>
                  ) : null}
                  {entry.isFavorite ? (
                    <Heart
                      size={12}
                      filled
                      className="mt-[4px] shrink-0 text-accent"
                      title={t("journal.list.favorite")}
                    />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function SearchResults({ search }: { search: JournalSearch }) {
  const activeId = useActiveEntryId();
  const { data: hits, loading } = useJournalSearch(search);
  const query = search.query.trim();

  if (!loading && hits.length === 0) {
    return (
      <EmptyState
        size="sm"
        title={query ? t("journal.list.noResults", { query }) : t("journal.list.noFilterResults")}
      />
    );
  }

  return (
    <section aria-label={t("journal.list.results")} className="flex flex-col gap-1">
      <p className="px-3 text-xs text-text-muted" aria-live="polite">
        {hits.length === 1
          ? t("journal.list.resultCountOne")
          : t("journal.list.resultCount", { count: hits.length })}
      </p>
      <ul className="flex flex-col gap-0.5">
        {hits.map((hit: SearchHit) => (
          <li key={hit.entry.id}>
            <button
              type="button"
              onClick={() => showEntry(hit.entry)}
              aria-current={hit.entry.id === activeId ? "true" : undefined}
              className={cn(rowClass(hit.entry.id === activeId), "flex-col gap-0.5")}
            >
              <span className="flex w-full items-center gap-2">
                <MoodDot mood={hit.entry.mood} />
                <span className="text-xs font-semibold text-text-muted">
                  {fullDayLabel(hit.entry.date)}
                </span>
                {hit.entry.isFavorite ? (
                  <Heart
                    size={12}
                    filled
                    className="ml-auto text-accent"
                    title={t("journal.list.favorite")}
                  />
                ) : null}
              </span>
              {hit.entry.title ? (
                <span className="w-full truncate text-sm font-semibold text-text">
                  <Highlight text={hit.entry.title} query={query} />
                </span>
              ) : null}
              <span className="line-clamp-2 w-full text-sm text-text-muted">
                {hit.snippet ? (
                  <Highlight text={hit.snippet} query={query} />
                ) : (
                  t("journal.list.untitled")
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
