import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router";
import { useEscapeClose, useHotkey, useScope } from "@/shared/hotkeys";
import { t } from "@/shared/i18n";
import { parseDateISO, todayISO, type DateISO } from "@/shared/lib/dates";
import { cn, ToastProvider } from "@/shared/ui";
import { formatPeriodTitle } from "../format";
import { buildMonthGrid, loadRange, periodKey, visibleRange, weekDays } from "../grid";
import { useCalendarSettings, useDayIndicators, useEventsByDay, useNow } from "../hooks";
import { journalPath } from "../routes";
import { useCalendarStore } from "../store";
import { CalendarDnd } from "./CalendarDnd";
import { CalendarHeader } from "./CalendarHeader";
import { DayPanel } from "./DayPanel";
import { EventDialog } from "./EventDialog";
import { MonthView } from "./MonthView";
import { TimeGrid } from "./TimeGrid";

const SLIDE_PX = 40;

/** New all-day event on `day` (stable reference for memoized cells). */
const createOn = (day: DateISO) =>
  useCalendarStore.getState().openCreate({ date: day, allDay: true });

const clearSelection = () => useCalendarStore.getState().selectDate(null);
const ease = [0.33, 0.9, 0.35, 1] as const;

/** Calendar screen (route `/calendar`). */
export function CalendarPage() {
  // TODO(A2): drop this provider once <ToastProvider> is mounted in src/app/providers.tsx.
  return (
    <ToastProvider>
      <CalendarScreen />
    </ToastProvider>
  );
}

function CalendarScreen() {
  useScope("calendar");
  const navigate = useNavigate();
  const settings = useCalendarSettings();
  const store = useCalendarStore();
  const { view, focusedDate, selectedDate, panelOpen, direction } = store;
  const reduceMotion = useReducedMotion();
  const now = useNow();
  const today = todayISO(now);
  const rootRef = useRef<HTMLDivElement>(null);

  const { initView } = store;
  useEffect(() => {
    if (settings.loaded) initView(settings.defaultView);
  }, [settings.loaded, settings.defaultView, initView]);

  const focused = parseDateISO(focusedDate);
  const { weekStartsOn, timeFormat } = settings;
  const visible = visibleRange(view, focused, weekStartsOn);
  const { from: loadFrom, to: loadTo } = loadRange(view, focused, weekStartsOn);
  const { byDay: eventsByDay, ...events } = useEventsByDay(loadFrom, loadTo);
  const indicators = useDayIndicators(visible.from, visible.to);

  const newEventInSelection = () => createOn(selectedDate ?? today);

  useHotkey("calendar.goToToday", store.goToToday);
  useHotkey("calendar.prev", () => store.step(-1));
  useHotkey("calendar.next", () => store.step(1));
  useHotkey("calendar.viewMonth", () => store.setView("month"));
  useHotkey("calendar.viewWeek", () => store.setView("week"));
  useHotkey("calendar.viewDay", () => store.setView("day"));
  useHotkey("calendar.newEvent", newEventInSelection);
  useHotkey("app.newItem", newEventInSelection);
  useHotkey("calendar.openJournal", () => navigate(journalPath(selectedDate ?? today)));
  useHotkey("calendar.togglePanel", store.togglePanel, { enabled: view !== "day" });
  // Escape (outside dialogs and popovers, which close themselves) clears the selected day.
  useEscapeClose(rootRef, clearSelection);

  const key = periodKey(view, focused, weekStartsOn);
  const slide = reduceMotion ? 0 : SLIDE_PX;
  const isDay = view === "day";
  const panelDay = isDay ? focusedDate : selectedDate;
  const panelEvents = (panelDay && eventsByDay.get(panelDay)) || [];

  return (
    <div ref={rootRef} data-escape-close="" className="flex h-full min-h-0 flex-col">
      <CalendarHeader
        title={formatPeriodTitle(view, visible, focused)}
        view={view}
        panelOpen={panelOpen}
        showPanelToggle={!isDay}
        onPrev={() => store.step(-1)}
        onNext={() => store.step(1)}
        onToday={store.goToToday}
        onViewChange={store.setView}
        onNewEvent={newEventInSelection}
        onTogglePanel={store.togglePanel}
      />
      <CalendarDnd timeFormat={timeFormat}>
        <div className="flex min-h-0 flex-1 gap-4 px-5 pb-5">
          <div
            aria-busy={events.loading}
            aria-label={events.loading ? t("calendar.loading") : undefined}
            className="relative min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-surface shadow-(--shadow-sm)"
          >
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={key}
                custom={direction}
                className="absolute inset-0"
                variants={{
                  enter: (dir: number) => ({ x: dir * slide, opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit: (dir: number) => ({ x: -dir * slide, opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease }}
              >
                {view === "month" ? (
                  <MonthView
                    weeks={buildMonthGrid(focused, weekStartsOn)}
                    month={focused}
                    eventsByDay={eventsByDay}
                    indicators={indicators.data}
                    selectedDate={selectedDate}
                    today={today}
                    timeFormat={timeFormat}
                    loading={events.loading}
                    onSelect={store.selectDate}
                    onCreate={createOn}
                  />
                ) : (
                  <TimeGrid
                    days={isDay ? [focused] : weekDays(focused, weekStartsOn)}
                    eventsByDay={eventsByDay}
                    selectedDate={selectedDate}
                    today={today}
                    now={now}
                    timeFormat={timeFormat}
                    onSelect={store.selectDate}
                    onCreate={store.openCreate}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          {isDay || panelOpen ? (
            <DayPanel
              day={panelDay}
              events={panelEvents}
              eventsLoading={events.loading}
              timeFormat={timeFormat}
              onCreate={createOn}
              className={cn(
                "shrink-0 rounded-lg border border-border bg-bg-elevated",
                isDay ? "w-[360px]" : "w-[320px]",
              )}
            />
          ) : null}
        </div>
      </CalendarDnd>
      <EventDialog weekStartsOn={weekStartsOn} timeFormat={timeFormat} />
    </div>
  );
}
