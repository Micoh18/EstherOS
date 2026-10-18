import { useEffect, useRef, useState } from "react";
import { useHotkey, useScope } from "@/shared/hotkeys";
import { todayISO } from "@/shared/lib/dates";
import { ToastProvider } from "@/shared/ui";
import { openAdjacentEntry, openJournalDate } from "../hooks";
import { clearRequestedDate, peekRequestedDate, showDraft, useJournalStore } from "../store";
import { EntryPane } from "./EntryPane";
import { JournalSidebar } from "./JournalSidebar";

/** Journal screen: search, mini calendar and entries on the left; the open entry on the right. */
export function JournalPage() {
  useScope("journal");

  // Today's latest entry (or a blank draft), unless another screen asked for a specific day.
  const [initialDate] = useState(peekRequestedDate);
  useEffect(() => {
    void openJournalDate(initialDate);
    clearRequestedDate();
  }, [initialDate]);

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
    // TODO(A7): quitar este ToastProvider cuando la raíz (src/app/providers.tsx) monte uno.
    <ToastProvider>
      <div className="flex h-full min-h-0">
        <aside className="flex w-[312px] shrink-0 flex-col border-r border-border bg-bg-elevated px-4 pt-5">
          <JournalSidebar searchRef={searchRef} />
        </aside>
        <section className="min-w-0 flex-1 overflow-y-auto px-6 py-6">
          <EntryPane />
        </section>
      </div>
    </ToastProvider>
  );
}
