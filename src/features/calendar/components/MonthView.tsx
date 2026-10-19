import { memo, useCallback, useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { addDays, format, isSameMonth, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { parseDateISO, toDateISO, type DateISO } from "@/shared/lib/dates";
import { t } from "@/shared/i18n";
import { cn, Skeleton } from "@/shared/ui";
import { capitalize, type TimeFormat } from "../format";
import type { DayIndicator } from "../hooks";
import type { EventOccurrence } from "../model";
import { DROP_DAY_ATTR } from "./dnd";
import { isEmptyAreaEvent, isOwnDomEvent } from "./dom";
import { CalendarEvent } from "./CalendarEvent";
import { useCalendarStore } from "../store";

/** Events listed per cell before collapsing into "+N más". */
const MAX_VISIBLE = 3;
const NO_EVENTS: EventOccurrence[] = [];

/**
 * Day whose cell takes DOM focus on its next render. Module-level so it reaches the cell of a
 * freshly mounted grid after an arrow key crossed into the next/previous month.
 */
let pendingFocusDay: DateISO | null = null;

interface MonthViewProps {
  weeks: Date[][];
  /** Any day of the month shown (days of other months are dimmed). */
  month: Date;
  eventsByDay: Map<DateISO, EventOccurrence[]>;
  indicators: Map<DateISO, DayIndicator> | undefined;
  selectedDate: DateISO | null;
  today: DateISO;
  timeFormat: TimeFormat;
  loading: boolean;
  onSelect: (day: DateISO) => void;
  onCreate: (day: DateISO) => void;
}

export function MonthView({
  weeks,
  month,
  eventsByDay,
  indicators,
  selectedDate,
  today,
  timeFormat,
  loading,
  onSelect,
  onCreate,
}: MonthViewProps) {
  const first = toDateISO(weeks[0][0]);
  const last = toDateISO(weeks[weeks.length - 1][6]);
  const inGrid = useCallback((day: DateISO) => day >= first && day <= last, [first, last]);
  // Roving tabindex: the grid always keeps exactly one tab stop.
  const tabStop =
    selectedDate !== null && inGrid(selectedDate)
      ? selectedDate
      : inGrid(today)
        ? today
        : toDateISO(startOfMonth(month));

  const moveTo = useCallback(
    (from: DateISO, offset: number) => {
      const target = toDateISO(addDays(parseDateISO(from), offset));
      if (target === from) return;
      // Crossing the grid edge shows the adjacent month, which always contains the target.
      if (!inGrid(target)) useCalendarStore.getState().step(target > last ? 1 : -1);
      pendingFocusDay = target;
      onSelect(target);
    },
    [inGrid, last, onSelect],
  );

  return (
    <div role="grid" aria-label={t("calendar.view.month")} className="flex h-full flex-col">
      <div role="row" className="grid grid-cols-7 border-b border-border">
        {weeks[0].map((day) => (
          <span
            key={day.toISOString()}
            role="columnheader"
            aria-label={format(day, "EEEE", { locale: es })}
            className="py-2 text-center text-xs font-semibold tracking-wide text-text-muted uppercase"
          >
            {format(day, "EEE", { locale: es }).replace(".", "")}
          </span>
        ))}
      </div>
      <div
        className="grid min-h-0 flex-1 auto-rows-fr"
        style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(96px, 1fr))` }}
      >
        {weeks.map((week) => (
          <div key={week[0].toISOString()} role="row" className="grid grid-cols-7">
            {week.map((date, column) => {
              const day = toDateISO(date);
              return (
                <MonthCell
                  key={day}
                  day={day}
                  date={date}
                  outside={!isSameMonth(date, month)}
                  events={eventsByDay.get(day) ?? NO_EVENTS}
                  indicator={indicators?.get(day)}
                  selected={day === selectedDate}
                  tabStop={day === tabStop}
                  column={column}
                  isToday={day === today}
                  isPast={day < today}
                  timeFormat={timeFormat}
                  loading={loading}
                  onSelect={onSelect}
                  onCreate={onCreate}
                  onMove={moveTo}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

interface MonthCellProps {
  day: DateISO;
  date: Date;
  outside: boolean;
  events: EventOccurrence[];
  indicator: DayIndicator | undefined;
  selected: boolean;
  /** The single cell of the grid reachable with Tab. */
  tabStop: boolean;
  /** Position inside its week row (0-6), for Home/End. */
  column: number;
  isToday: boolean;
  isPast: boolean;
  timeFormat: TimeFormat;
  loading: boolean;
  onSelect: (day: DateISO) => void;
  onCreate: (day: DateISO) => void;
  /** Selects and focuses the day `offset` days away from `from`. */
  onMove: (from: DateISO, offset: number) => void;
}

/** Day offsets of the grid navigation keys; Home/End depend on the column. */
function keyOffset(key: string, column: number): number | null {
  switch (key) {
    case "ArrowLeft":
      return -1;
    case "ArrowRight":
      return 1;
    case "ArrowUp":
      return -7;
    case "ArrowDown":
      return 7;
    case "Home":
      return -column;
    case "End":
      return 6 - column;
    default:
      return null;
  }
}

const MonthCell = memo(function MonthCell({
  day,
  date,
  outside,
  events,
  indicator,
  selected,
  tabStop,
  column,
  isToday,
  isPast,
  timeFormat,
  loading,
  onSelect,
  onCreate,
  onMove,
}: MonthCellProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Runs on every render: the target cell re-renders (or mounts) once it becomes selected.
  useLayoutEffect(() => {
    if (pendingFocusDay !== day) return;
    pendingFocusDay = null;
    ref.current?.focus();
  });
  const visible = events.length > MAX_VISIBLE ? events.slice(0, MAX_VISIBLE - 1) : events;
  const hidden = events.length - visible.length;
  const tasks = indicator?.tasks ?? 0;

  return (
    <div
      {...{ [DROP_DAY_ATTR]: day }}
      role="gridcell"
      aria-selected={selected}
      aria-label={capitalize(format(date, "EEEE d 'de' MMMM", { locale: es }))}
      ref={ref}
      tabIndex={tabStop ? 0 : -1}
      data-day={day}
      onClick={(event) => {
        if (isOwnDomEvent(event)) onSelect(day);
      }}
      onDoubleClick={(event) => {
        if (!isEmptyAreaEvent(event)) return;
        onCreate(day);
      }}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget) return;
        const offset =
          event.altKey || event.ctrlKey || event.metaKey ? null : keyOffset(event.key, column);
        if (offset !== null) {
          // Keeps the app-level calendar.prev/next arrows from also moving the period.
          event.preventDefault();
          event.stopPropagation();
          onMove(day, offset);
          return;
        }
        if (event.key === "Enter") onCreate(day);
        if (event.key === " ") {
          event.preventDefault();
          onSelect(day);
        }
      }}
      className={cn(
        "flex min-h-0 min-w-0 flex-col gap-1 overflow-hidden border-r border-b border-border p-1.5",
        "cursor-default transition-colors duration-(--dur-fast) outline-none",
        "focus-visible:shadow-[inset_0_0_0_2px_var(--accent)]",
        outside ? "bg-bg" : "bg-surface",
        selected && "bg-accent-soft/60",
        !selected && "hover:bg-surface-hover",
        "data-[drop-over]:bg-accent-soft data-[drop-over]:shadow-[inset_0_0_0_2px_var(--accent)]",
      )}
    >
      <div className="flex items-center gap-1">
        <span
          aria-current={isToday ? "date" : undefined}
          className={cn(
            "flex size-[26px] items-center justify-center rounded-full text-sm",
            isToday
              ? "bg-accent font-bold text-on-accent"
              : outside
                ? "text-text-faint"
                : isPast
                  ? "text-text-muted"
                  : "font-semibold text-text",
          )}
        >
          {format(date, "d")}
        </span>
        <span className="ml-auto flex items-center gap-1">
          {tasks > 0 ? (
            <span
              title={tasks === 1 ? t("calendar.taskDue") : t("calendar.tasksDue", { count: tasks })}
              className="rounded-full bg-bg-elevated px-1.5 font-mono text-[10px] leading-4 text-text-muted"
            >
              {tasks}
            </span>
          ) : null}
          {indicator?.journal ? (
            <span
              title={t("calendar.hasJournal")}
              className="size-[6px] rounded-full bg-text-faint"
            />
          ) : null}
        </span>
      </div>
      {loading ? (
        <Skeleton className="h-[18px]! w-3/4" />
      ) : (
        <div className="flex min-w-0 flex-col gap-0.5">
          {visible.map((occurrence) => (
            <CalendarEvent
              key={occurrence.key}
              occurrence={occurrence}
              day={day}
              timeFormat={timeFormat}
            />
          ))}
          {hidden > 0 ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                useCalendarStore.getState().showDay(day);
              }}
              className={cn(
                "relative self-start rounded-full px-2 text-xs font-semibold text-text-muted",
                "outline-none hover:bg-bg-elevated hover:text-text focus-visible:shadow-(--shadow-glow)",
                // Taller invisible hit area, mostly below so it does not cover the event above.
                "before:absolute before:inset-x-0 before:-top-[2px] before:-bottom-[14px] before:content-['']",
              )}
            >
              {t("calendar.more", { count: hidden })}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
});
