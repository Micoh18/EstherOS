import { memo, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { format, getHours, getMinutes, setHours, setMinutes, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { toDateISO, type DateISO } from "@/shared/lib/dates";
import { t } from "@/shared/i18n";
import { cn } from "@/shared/ui";
import type { Task } from "@/features/todo";
import { capitalize, formatClock, type TimeFormat } from "../format";
import { layoutColumns, MINUTES_PER_DAY, timedSegmentsFor, type DaySegment } from "../layout";
import type { EventOccurrence } from "../model";
import { useCalendarStore, type EventDraft } from "../store";
import { DROP_DAY_ATTR } from "./dnd";
import { isEmptyAreaEvent } from "./dom";
import { CalendarEvent, EventBlock } from "./CalendarEvent";
import { CalendarTask, TASK_BLOCK_MINUTES } from "./CalendarTask";

export const HOUR_PX = 48;
/** All-day items shown per day before collapsing the rest into "+N más". */
const MAX_ALL_DAY = 3;
const GRID_HEIGHT = 24 * HOUR_PX;
const INITIAL_SCROLL_HOUR = 7;
const SNAP_MINUTES = 15;
/** A press shorter than this is a click: it creates a one-hour event on the half hour. */
const MIN_DRAG_MINUTES = 30;
const NO_EVENTS: EventOccurrence[] = [];
const NO_TASKS: Task[] = [];
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

interface TimeGridProps {
  days: Date[];
  eventsByDay: Map<DateISO, EventOccurrence[]>;
  /** Tasks due per day: timed ones go in the hour grid, date-only ones in the all-day row. */
  tasksByDay: Map<DateISO, Task[]>;
  selectedDate: DateISO | null;
  today: DateISO;
  now: Date;
  timeFormat: TimeFormat;
  onSelect: (day: DateISO) => void;
  onCreate: (draft: EventDraft) => void;
}

/** Week and day views: all-day row on top, 24 h axis below with positioned timed events. */
export function TimeGrid({
  days,
  eventsByDay,
  tasksByDay,
  selectedDate,
  today,
  now,
  timeFormat,
  onSelect,
  onCreate,
}: TimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDay = days.length === 1;

  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = INITIAL_SCROLL_HOUR * HOUR_PX;
  }, []);

  const columns = `56px repeat(${days.length}, minmax(0, 1fr))`;
  const base = startOfDay(now);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Day headers */}
      <div
        className="grid border-b border-border pr-[var(--scrollbar-gap,8px)]"
        style={{ gridTemplateColumns: columns }}
      >
        <span />
        {days.map((date) => {
          const day = toDateISO(date);
          const isToday = day === today;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect(day)}
              aria-pressed={day === selectedDate}
              className={cn(
                "flex items-center justify-center gap-2 rounded-md py-2 text-sm outline-none",
                "hover:bg-surface-hover focus-visible:shadow-(--shadow-glow)",
                day === selectedDate && !isDay && "bg-accent-soft/60",
              )}
            >
              <span className="text-xs font-semibold tracking-wide text-text-muted uppercase">
                {isDay
                  ? capitalize(format(date, "EEEE", { locale: es }))
                  : format(date, "EEE", { locale: es }).replace(".", "")}
              </span>
              <span
                aria-current={isToday ? "date" : undefined}
                className={cn(
                  "flex size-[28px] items-center justify-center rounded-full font-display text-md",
                  isToday
                    ? "bg-accent font-semibold text-on-accent"
                    : day < today && "text-text-muted",
                )}
              >
                {format(date, "d")}
              </span>
            </button>
          );
        })}
      </div>

      {/* All-day row */}
      <div
        className="grid border-b border-border pr-[var(--scrollbar-gap,8px)]"
        style={{ gridTemplateColumns: columns }}
      >
        <span className="self-center pr-2 text-right text-[10px] leading-tight text-text-faint">
          {t("calendar.allDayRow")}
        </span>
        {days.map((date) => {
          const day = toDateISO(date);
          return (
            <AllDayCell
              key={day}
              day={day}
              events={eventsByDay.get(day) ?? NO_EVENTS}
              tasks={tasksByDay.get(day) ?? NO_TASKS}
              timeFormat={timeFormat}
              onCreate={onCreate}
            />
          );
        })}
      </div>

      {/* Hours */}
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-scroll">
        <div className="grid" style={{ gridTemplateColumns: columns, height: GRID_HEIGHT }}>
          <div className="relative">
            {HOURS.slice(1).map((hour) => (
              <span
                key={hour}
                className="absolute right-2 -translate-y-1/2 font-mono text-[10px] text-text-faint"
                style={{ top: hour * HOUR_PX }}
              >
                {formatClock(setHours(base, hour), timeFormat)}
              </span>
            ))}
          </div>
          {days.map((date) => {
            const day = toDateISO(date);
            return (
              <DayColumn
                key={day}
                day={day}
                events={eventsByDay.get(day) ?? NO_EVENTS}
                tasks={tasksByDay.get(day) ?? NO_TASKS}
                nowMinutes={day === today ? getHours(now) * 60 + getMinutes(now) : null}
                timeFormat={timeFormat}
                onSelect={onSelect}
                onCreate={onCreate}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

const AllDayCell = memo(function AllDayCell({
  day,
  events,
  tasks,
  timeFormat,
  onCreate,
}: {
  day: DateISO;
  events: EventOccurrence[];
  tasks: Task[];
  timeFormat: TimeFormat;
  onCreate: (draft: EventDraft) => void;
}) {
  const allDay = events.filter((occurrence) => occurrence.allDay);
  const dateOnlyTasks = tasks.filter((task) => !task.dueTime);
  // Same cap as the month cells: past it, the last slot becomes "+N más" (the panel lists all).
  const total = allDay.length + dateOnlyTasks.length;
  const slots = total > MAX_ALL_DAY ? MAX_ALL_DAY - 1 : total;
  const shownEvents = allDay.slice(0, slots);
  const shownTasks = dateOnlyTasks.slice(0, slots - shownEvents.length);
  const hidden = total - shownEvents.length - shownTasks.length;
  return (
    <div
      {...{ [DROP_DAY_ATTR]: day }}
      onDoubleClick={(event) => {
        if (!isEmptyAreaEvent(event)) return;
        onCreate({ date: day, allDay: true });
      }}
      className={cn(
        "flex min-h-[32px] min-w-0 flex-col gap-0.5 border-l border-border p-1",
        "data-[drop-over]:bg-accent-soft",
      )}
    >
      {shownEvents.map((occurrence) => (
        <CalendarEvent
          key={occurrence.key}
          occurrence={occurrence}
          day={day}
          timeFormat={timeFormat}
        />
      ))}
      {shownTasks.map((task) => (
        <CalendarTask key={task.id} task={task} variant="pill" timeFormat={timeFormat} />
      ))}
      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => useCalendarStore.getState().showDay(day)}
          className="self-start rounded-full px-2 text-xs font-semibold text-text-muted outline-none hover:bg-bg-elevated hover:text-text focus-visible:shadow-(--shadow-glow)"
        >
          {t("calendar.more", { count: hidden })}
        </button>
      ) : null}
    </div>
  );
});

interface Selection {
  anchor: number;
  current: number;
}

function toTime(minutes: number): string {
  const clamped = Math.min(minutes, MINUTES_PER_DAY - 1);
  return format(setMinutes(startOfDay(new Date()), clamped), "HH:mm");
}

function draftFrom(day: DateISO, selection: Selection): EventDraft {
  let start = Math.min(selection.anchor, selection.current);
  let end = Math.max(selection.anchor, selection.current) + SNAP_MINUTES;
  if (end - start < MIN_DRAG_MINUTES) {
    start = Math.floor(selection.anchor / 30) * 30;
    end = start + 60;
  }
  return { date: day, allDay: false, startTime: toTime(start), endTime: toTime(end) };
}

const DayColumn = memo(function DayColumn({
  day,
  events,
  tasks,
  nowMinutes,
  timeFormat,
  onSelect,
  onCreate,
}: {
  day: DateISO;
  events: EventOccurrence[];
  tasks: Task[];
  nowMinutes: number | null;
  timeFormat: TimeFormat;
  onSelect: (day: DateISO) => void;
  onCreate: (draft: EventDraft) => void;
}) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const layout = useMemo(() => layoutColumns(timedSegmentsFor(events, day)), [events, day]);

  const minutesAt = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const minutes = ((event.clientY - rect.top) / HOUR_PX) * 60;
    const snapped = Math.floor(minutes / SNAP_MINUTES) * SNAP_MINUTES;
    return Math.max(0, Math.min(MINUTES_PER_DAY - SNAP_MINUTES, snapped));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !isEmptyAreaEvent(event)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const minutes = minutesAt(event);
    setSelection({ anchor: minutes, current: minutes });
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!selection) return;
    const minutes = minutesAt(event);
    if (minutes !== selection.current) setSelection({ ...selection, current: minutes });
  };

  const onPointerUp = () => {
    if (!selection) return;
    setSelection(null);
    onSelect(day);
    onCreate(draftFrom(day, selection));
  };

  const preview = selection ? draftFrom(day, selection) : null;

  return (
    <div
      {...{ [DROP_DAY_ATTR]: day }}
      data-day={day}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setSelection(null)}
      className="relative border-l border-border select-none data-[drop-over]:bg-accent-soft/50"
      style={{
        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_PX - 1}px, var(--border) ${HOUR_PX - 1}px, var(--border) ${HOUR_PX}px)`,
      }}
    >
      {layout.placed.map(({ item, column, columns }) => (
        <EventBlock
          key={item.occurrence.key}
          occurrence={item.occurrence}
          day={day}
          timeFormat={timeFormat}
          compact={item.end - item.start < 45}
          style={blockStyle(item, column, columns)}
        />
      ))}
      {layout.overflow.map((group) => (
        <button
          key={`overflow-${group.start}`}
          type="button"
          data-event-block=""
          onClick={() => useCalendarStore.getState().showDay(day)}
          className="absolute flex items-start justify-center rounded-sm border border-border bg-bg-elevated pt-1 text-xs font-semibold text-text-muted outline-none hover:text-text focus-visible:shadow-[inset_0_0_0_2px_var(--accent)]"
          style={blockStyle(group, group.column, group.columns)}
        >
          {t("calendar.moreShort", { count: group.items.length })}
        </button>
      ))}
      {tasks.map((task) =>
        task.dueTime ? (
          <CalendarTask
            key={task.id}
            task={task}
            variant="block"
            timeFormat={timeFormat}
            style={taskBlockStyle(task.dueTime, layout.placed)}
          />
        ) : null,
      )}
      {preview ? <SelectionPreview draft={preview} /> : null}
      {nowMinutes !== null ? (
        <div
          aria-label={t("calendar.now")}
          className="pointer-events-none absolute right-0 left-0 z-20 h-[2px] bg-accent"
          style={{ top: (nowMinutes / 60) * HOUR_PX }}
        >
          <span className="absolute -top-[4px] -left-[5px] size-[10px] rounded-full bg-accent" />
        </div>
      ) : null}
    </div>
  );
});

function blockStyle(item: Pick<DaySegment, "start" | "end">, column: number, columns: number) {
  const top = (item.start / 60) * HOUR_PX;
  const height = Math.max(((item.end - item.start) / 60) * HOUR_PX, 20);
  return {
    top: top + 1,
    height: height - 2,
    left: `calc(${(column / columns) * 100}% + 2px)`,
    width: `calc(${100 / columns}% - 4px)`,
  };
}

/**
 * Light 30 min block at the task's time. Full width on a free slot; on the right half when it
 * overlaps an event, so the event stays readable.
 */
function taskBlockStyle(dueTime: string, events: readonly { item: DaySegment }[]) {
  const [hours, minutes] = dueTime.split(":").map(Number);
  const start = Math.min(hours * 60 + minutes, MINUTES_PER_DAY - TASK_BLOCK_MINUTES);
  const end = start + TASK_BLOCK_MINUTES;
  const overlaps = events.some(({ item }) => item.start < end && item.end > start);
  return {
    top: (start / 60) * HOUR_PX + 1,
    height: (TASK_BLOCK_MINUTES / 60) * HOUR_PX - 2,
    right: 2,
    width: overlaps ? "calc(50% - 4px)" : "calc(100% - 4px)",
  };
}

function SelectionPreview({ draft }: { draft: EventDraft }) {
  const [sh, sm] = (draft.startTime ?? "00:00").split(":").map(Number);
  const [eh, em] = (draft.endTime ?? "00:00").split(":").map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute right-1 left-1 z-10 rounded-sm border-2 border-dashed border-accent bg-accent-soft/70 px-1.5 py-0.5 font-mono text-[11px] text-text"
      style={{ top: (start / 60) * HOUR_PX, height: ((end - start) / 60) * HOUR_PX }}
    >
      {draft.startTime} – {draft.endTime}
    </div>
  );
}
