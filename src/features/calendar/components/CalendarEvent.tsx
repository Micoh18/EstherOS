import { memo, useCallback, type CSSProperties } from "react";
import { Repeat } from "lucide-react";
import type { DateISO } from "@/shared/lib/dates";
import { cn } from "@/shared/ui";
import { colorClasses, formatEventTime, type TimeFormat } from "../format";
import type { EventOccurrence } from "../model";
import { useDraggableEvent } from "./dnd";
import { EventChip } from "./EventChip";
import { useEventPopover } from "./useEventPopover";

interface CalendarEventProps {
  occurrence: EventOccurrence;
  /** Day the event is drawn on (drag source). */
  day: DateISO;
  timeFormat: TimeFormat;
  variant?: "pill" | "row";
}

/** Ref for an event element that is both draggable and the anchor of its popover. */
function useEventRef(
  setNodeRef: (node: HTMLElement | null) => void,
  anchorRef: { current: HTMLElement | null },
) {
  return useCallback(
    (node: HTMLElement | null) => {
      setNodeRef(node);
      anchorRef.current = node;
    },
    [setNodeRef, anchorRef],
  );
}

/**
 * Draggable event chip that opens its popover on click. Memoized: a month cell re-renders when
 * its task or journal indicator arrives, and its events have not changed then.
 */
export const CalendarEvent = memo(function CalendarEvent({
  occurrence,
  day,
  timeFormat,
  variant = "pill",
}: CalendarEventProps) {
  const { setNodeRef, isDragging, dragProps } = useDraggableEvent(occurrence, day);
  const { anchorRef, triggerProps, popover } = useEventPopover(occurrence, timeFormat);
  const ref = useEventRef(setNodeRef, anchorRef);
  return (
    <>
      <EventChip
        ref={ref}
        {...dragProps}
        {...triggerProps}
        occurrence={occurrence}
        timeFormat={timeFormat}
        variant={variant}
        className={cn(isDragging && "opacity-40")}
      />
      {popover}
    </>
  );
});

interface EventBlockProps {
  occurrence: EventOccurrence;
  day: DateISO;
  timeFormat: TimeFormat;
  style: CSSProperties;
  /** Short blocks only show the title. */
  compact: boolean;
}

/** Timed event positioned in the week/day time grid. */
export function EventBlock({ occurrence, day, timeFormat, style, compact }: EventBlockProps) {
  const { setNodeRef, isDragging, dragProps } = useDraggableEvent(occurrence, day);
  const { anchorRef, triggerProps, popover } = useEventPopover(occurrence, timeFormat);
  const ref = useEventRef(setNodeRef, anchorRef);
  const colors = colorClasses(occurrence.color);
  const time = formatEventTime(occurrence, timeFormat);
  return (
    <>
      <button
        type="button"
        ref={ref}
        {...dragProps}
        {...triggerProps}
        style={style}
        aria-label={`${occurrence.title} · ${time}`}
        data-past-log={occurrence.isPastLog || undefined}
        className={cn(
          "absolute flex flex-col overflow-hidden rounded-sm border-2 px-1.5 text-left text-xs text-text",
          "outline-none focus-visible:shadow-(--shadow-glow)",
          "transition-shadow duration-(--dur-fast) hover:z-10 hover:shadow-(--shadow-md)",
          compact ? "justify-center" : "py-1",
          colors.fill,
          occurrence.isPastLog ? cn("border-dashed", colors.edge) : "border-surface",
          isDragging && "opacity-40",
        )}
      >
        <span className="flex items-center gap-1 truncate font-semibold">
          <span className="truncate">{occurrence.title}</span>
          {occurrence.isRecurring ? <Repeat aria-hidden className="size-3 shrink-0" /> : null}
        </span>
        {!compact ? <span className="truncate font-mono text-[11px] text-text">{time}</span> : null}
      </button>
      {popover}
    </>
  );
}
