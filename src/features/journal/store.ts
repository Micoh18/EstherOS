import { create } from "zustand";
import {
  todayISO,
  toYearMonth,
  parseDateISO,
  type DateISO,
  type YearMonth,
} from "@/shared/lib/dates";

/**
 * The entry open in the editor. `seq` identifies the editing session: it stays the same when a
 * draft gets persisted (so the editor is not remounted) and changes when another entry opens.
 */
export interface ActiveEntry {
  seq: number;
  entryId: string | null;
  date: DateISO;
}

interface JournalState {
  active: ActiveEntry | null;
  /** Month shown by the mini calendar and the list. */
  visibleMonth: YearMonth;
  /** Day another screen asked to open (e.g. "open journal" from the calendar). */
  requestedDate: DateISO | null;
}

let nextSeq = 1;

export const useJournalStore = create<JournalState>(() => ({
  active: null,
  visibleMonth: toYearMonth(new Date()),
  requestedDate: null,
}));

const monthOf = (date: DateISO) => toYearMonth(parseDateISO(date));

/** Opens a saved entry in the editor and shows its month. */
export function showEntry(entry: { id: string; date: DateISO }): void {
  useJournalStore.setState({
    active: { seq: nextSeq++, entryId: entry.id, date: entry.date },
    visibleMonth: monthOf(entry.date),
  });
}

/** Opens a blank, in-memory entry for `date`; it is only persisted once something is written. */
export function showDraft(date: DateISO): void {
  useJournalStore.setState({
    active: { seq: nextSeq++, entryId: null, date },
    visibleMonth: monthOf(date),
  });
}

/** The draft of session `seq` was saved as `entryId`. */
export function markPersisted(seq: number, entryId: string): void {
  useJournalStore.setState((state) =>
    state.active?.seq === seq ? { active: { ...state.active, entryId } } : {},
  );
}

export function setVisibleMonth(month: YearMonth): void {
  useJournalStore.setState({ visibleMonth: month });
}

/**
 * Asks the journal to open `date` the next time it mounts (defaults to today). Other features
 * call it before navigating to the journal.
 */
export function requestJournalDate(date: DateISO = todayISO()): void {
  useJournalStore.setState({ requestedDate: date });
}

/** Day to open when the journal mounts: the requested one, or today. */
export function peekRequestedDate(): DateISO {
  return useJournalStore.getState().requestedDate ?? todayISO();
}

export function clearRequestedDate(): void {
  useJournalStore.setState({ requestedDate: null });
}

/** Placeholder rotation follows the session number. */
export function sessionIndex(seq: number, length: number): number {
  return seq % length;
}
