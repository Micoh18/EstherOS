import { useEffect, useState } from "react";
import type { Tag } from "@/shared/db";
import { t } from "@/shared/i18n";
import type { DateISO } from "@/shared/lib/dates";
import { log } from "@/shared/lib/log";
import { Skeleton } from "@/shared/ui";
import { openJournalDate } from "../hooks";
import type { JournalEntry } from "../model";
import { getEntry, listEntryTags } from "../repository";
import { useJournalStore } from "../store";
import { EntrySession } from "./EntrySession";

function PaneSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[calc(68ch+80px)] flex-col gap-4" aria-busy="true">
      <span className="sr-only">{t("journal.entry.loading")}</span>
      <Skeleton className="h-[36px]! w-[280px]!" />
      <Skeleton shape="block" className="h-[360px]!" />
    </div>
  );
}

/** The open entry. A new session (and editor) starts whenever another entry is opened. */
export function EntryPane() {
  const active = useJournalStore((state) => state.active);
  if (!active) return <PaneSkeleton />;
  return (
    <EntryLoader key={active.seq} seq={active.seq} date={active.date} entryId={active.entryId} />
  );
}

interface Loaded {
  entry: JournalEntry | null;
  tags: Tag[];
}

function EntryLoader({
  seq,
  date,
  entryId,
}: {
  seq: number;
  date: DateISO;
  entryId: string | null;
}) {
  // Only the id the session started with matters: a draft that gets saved keeps its editor.
  const [initialId] = useState(entryId);
  const [loaded, setLoaded] = useState<Loaded | null>(initialId ? null : { entry: null, tags: [] });

  useEffect(() => {
    if (!initialId) return;
    let cancelled = false;
    Promise.all([getEntry(initialId), listEntryTags(initialId)])
      .then(([entry, tags]) => {
        if (!cancelled) setLoaded({ entry, tags: entry ? tags : [] });
      })
      .catch((error: unknown) => {
        log.error("could not load journal entry", error);
        if (!cancelled) setLoaded({ entry: null, tags: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [initialId]);

  if (!loaded) return <PaneSkeleton />;
  return (
    <EntrySession
      seq={seq}
      date={loaded.entry?.date ?? date}
      initial={loaded.entry}
      initialTags={loaded.tags}
      onDeleted={() => void openJournalDate(date)}
    />
  );
}
