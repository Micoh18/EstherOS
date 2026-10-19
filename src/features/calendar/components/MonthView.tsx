import { memo } from "react";
import { format, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import { toDateISO, type DateISO } from "@/shared/lib/dates";
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
            {week.map((date) => {
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
                  isToday={day === today}
                  isPast={day < today}
                  timeFormat={timeFormat}
                  loading={loading}
                  onSelect={onSelect}
                  onCreate={onCreate}
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
  isToday: boolean;
  isPast: boolean;
  timeFormat: TimeFormat;
  loading: boolean;
  onSelect: (day: DateISO) => void;
  onCreate: (day: DateISO) => void;
}

const MonthCell = memo(function MonthCell({
  day,
  date,
  outside,
  events,
  indicator,
  selected,
  isToday,
  isPast,
  timeFormat,
  loading,
  onSelect,
  onCreate,
}: MonthCellProps) {
  const visible = events.length > MAX_VISIBLE ? events.slice(0, MAX_VISIBLE - 1) : events;
  const hidden = events.length - visible.length;
  const tasks = indicator?.tasks ?? 0;

  return (
    <div
      {...{ [DROP_DAY_ATTR]: day }}
      role="gridcell"
      aria-selected={selected}
      aria-label={capitalize(format(date, "EEEE d 'de' MMMM", { locale: es }))}
      tabIndex={selected ? 0 : -1}
      data-day={day}
      onClick={(event) => {
        if (isOwnDomEvent(event)) onSelect(day);
      }}
      onDoubleClick={(event) => {
        if (!isEmptyAreaEvent(event)) return;
        onCreate(day);
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter") onCreate(day);
        if (event.key === " ") {
          event.preventDefault();
          onSelect(day);
        }
      }}
      className={cn(
        "flex min-h-0 min-w-0 flex-col gap-1 overflow-hidden border-r border-b border-border p-1.5",
        "cursor-default transition-colors duration-(--dur-fast) outline-none",
        "focus-visible:shadow-[inset_0_0_0_2px_var(--accent-soft)]",
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
              className="self-start rounded-full px-2 text-xs font-semibold text-text-muted hover:bg-bg-elevated hover:text-text"
            >
              {t("calendar.more", { count: hidden })}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
});
