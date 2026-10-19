import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useHotkey, useScope } from "@/shared/hotkeys";
import { isValidDateISO, todayISO } from "@/shared/lib/dates";
import { openAdjacentEntry, openJournalDate } from "../hooks";
import {
  clearActive,
  clearRequestedDate,
  peekRequestedDate,
  showDraft,
  useJournalStore,
} from "../store";
import { EntryPane } from "./EntryPane";
import { JournalSidebar } from "./JournalSidebar";

/** Journal screen: search, mini calendar and entries on the left; the open entry on the right. */
export function JournalPage() {
  useScope("journal");

  // Today's latest entry (or a blank draft), unless another screen asked for a specific day
  // with `requestJournalDate()` or a `?date=YYYY-MM-DD` link.
  const [initialDate] = useState(peekRequestedDate);
  useEffect(() => {
    void openJournalDate(initialDate);
    clearRequestedDate();
    return clearActive;
  }, [initialDate]);

  const [params, setParams] = useSearchParams();
  useEffect(() => {
    const date = params.get("date");
    if (date === null) return;
    setParams({}, { replace: true });
    if (isValidDateISO(date)) void openJournalDate(date);
  }, [params, setParams]);

  const searchRef = useRef<HTMLInputElement>(null);

  useHotkey("journal.newEntry", () =>
    showDraft(useJournalStore.getState().active?.date ?? todayISO()),
  );
  useHotkey("journal.search", () => {
    searchRef.current?.focus();
    searchRef.current?.select();
  });
  useHotkey("journal.goToToday", () => void openJournalDate(todayISO()));
  useHotkey("journal.prevEntry", () => void openAdjacentEntry("prev"));
  useHotkey("journal.nextEntry", () => void openAdjacentEntry("next"));

  return (
    <div className="flex h-full min-h-0">
      <aside className="flex w-[312px] shrink-0 flex-col border-r border-border bg-bg-elevated px-4 pt-5">
        <JournalSidebar searchRef={searchRef} />
      </aside>
      <section className="min-w-0 flex-1 overflow-y-auto px-6 py-6">
        <EntryPane />
      </section>
    </div>
  );
}
