import { create } from "zustand";
import { parseDateISO, todayISO, toDateISO, type DateISO } from "@/shared/lib/dates";
import { shiftPeriod, type CalendarView } from "./grid";

/** What the event dialog was opened for. */
export type EventDialogState =
  { mode: "create"; draft: EventDraft } | { mode: "edit"; eventId: string } | null;

/** Prefilled values for a new event. */
export interface EventDraft {
  date: DateISO;
  allDay: boolean;
  /** `HH:mm`, only for timed drafts. */
  startTime?: string;
  endTime?: string;
}

interface CalendarState {
  view: CalendarView;
  /** Any day inside the visible period. */
  focusedDate: DateISO;
  /** Day shown in the side panel; `null` after Escape. */
  selectedDate: DateISO | null;
  panelOpen: boolean;
  /** Direction of the last period change, for the slide transition. */
  direction: 1 | -1 | 0;
  /** Whether the stored default view was already applied this session. */
  viewInitialized: boolean;
  dialog: EventDialogState;

  setView: (view: CalendarView) => void;
  initView: (view: CalendarView) => void;
  step: (direction: 1 | -1) => void;
  goToToday: () => void;
  selectDate: (date: DateISO | null) => void;
  /** Selects `date` and makes sure the side panel is open (it lists everything of that day). */
  showDay: (date: DateISO) => void;
  togglePanel: () => void;
  openCreate: (draft: EventDraft) => void;
  openEdit: (eventId: string) => void;
  closeDialog: () => void;
}

/** UI state of the calendar screen (data lives in SQLite, loaded by hooks). */
export const useCalendarStore = create<CalendarState>((set, get) => ({
  view: "month",
  focusedDate: todayISO(),
  selectedDate: todayISO(),
  panelOpen: true,
  direction: 0,
  viewInitialized: false,
  dialog: null,

  setView: (view) => {
    const { selectedDate, focusedDate } = get();
    // Switching to a narrower view lands on the selected day when it is in the current period.
    set({ view, focusedDate: selectedDate ?? focusedDate, direction: 0, viewInitialized: true });
  },
  initView: (view) => {
    if (!get().viewInitialized) set({ view, viewInitialized: true });
  },
  step: (direction) => {
    const { view, focusedDate, selectedDate } = get();
    const next = toDateISO(shiftPeriod(view, parseDateISO(focusedDate), direction));
    set({
      focusedDate: next,
      direction,
      // Day view follows the selection; other views keep it unless it was the focused day.
      selectedDate: view === "day" || selectedDate === focusedDate ? next : selectedDate,
    });
  },
  goToToday: () => {
    const today = todayISO();
    const { focusedDate } = get();
    set({
      focusedDate: today,
      selectedDate: today,
      direction: today === focusedDate ? 0 : today > focusedDate ? 1 : -1,
    });
  },
  selectDate: (date) => {
    const { view } = get();
    set(
      view === "day" && date ? { selectedDate: date, focusedDate: date } : { selectedDate: date },
    );
  },
  showDay: (date) => {
    get().selectDate(date);
    set({ panelOpen: true });
  },
  togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
  openCreate: (draft) => set({ dialog: { mode: "create", draft } }),
  openEdit: (eventId) => set({ dialog: { mode: "edit", eventId } }),
  closeDialog: () => set({ dialog: null }),
}));
