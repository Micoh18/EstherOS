import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  addDays,
  addMonths,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, focusRing } from "./cn";
import { IconButton } from "./IconButton";
import { t } from "@/shared/i18n";

export interface MonthGridProps {
  /** Visible month (controlled). Any date inside the month works. */
  month?: Date;
  /** Initial visible month when uncontrolled. Defaults to the selected date or today. */
  defaultMonth?: Date;
  onMonthChange?: (month: Date) => void;
  selected?: Date | null;
  onSelect?: (date: Date) => void;
  /** 0 = Sunday, 1 = Monday (default, setting `week_starts_on`). */
  weekStartsOn?: 0 | 1;
  /** Reference "today"; injectable for tests. */
  today?: Date;
  minDate?: Date;
  maxDate?: Date;
  /** Extra content under the day number (e.g. a mood dot or an event marker). */
  renderDay?: (date: Date) => ReactNode;
  className?: string;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Fixed 6-row grid so the height never jumps between months. */
function buildDays(month: Date, weekStartsOn: 0 | 1) {
  const first = startOfWeek(startOfMonth(month), { weekStartsOn });
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

/** Simple monthly calendar grid with keyboard navigation. Base of DatePicker and mini calendars. */
export function MonthGrid({
  month,
  defaultMonth,
  onMonthChange,
  selected = null,
  onSelect,
  weekStartsOn = 1,
  today = new Date(),
  minDate,
  maxDate,
  renderDay,
  className,
}: MonthGridProps) {
  const [uncontrolledMonth, setUncontrolledMonth] = useState(() =>
    startOfMonth(defaultMonth ?? selected ?? today),
  );
  const visibleMonth = startOfMonth(month ?? uncontrolledMonth);
  const [focused, setFocused] = useState<Date>(() => selected ?? today);
  // Set by keyboard navigation; the effect below moves DOM focus after the re-render.
  const pendingFocus = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const captionId = useId();

  const days = buildDays(visibleMonth, weekStartsOn);
  const weekdays = days.slice(0, 7);
  const weeks = Array.from({ length: 6 }, (_, i) => days.slice(i * 7, i * 7 + 7));
  const focusTarget = isSameMonth(focused, visibleMonth)
    ? focused
    : selected && isSameMonth(selected, visibleMonth)
      ? selected
      : visibleMonth;

  const changeMonth = (next: Date) => {
    const normalized = startOfMonth(next);
    if (month === undefined) setUncontrolledMonth(normalized);
    onMonthChange?.(normalized);
  };

  const isDisabled = (date: Date) =>
    (minDate !== undefined && isBefore(date, startOfDay(minDate))) ||
    (maxDate !== undefined && isAfter(startOfDay(date), startOfDay(maxDate)));

  useEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>('[data-focus-target="true"]')?.focus();
  });

  const moveFocus = (next: Date) => {
    setFocused(next);
    if (!isSameMonth(next, visibleMonth)) changeMonth(next);
    pendingFocus.current = true;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focusTarget, -1),
      ArrowRight: () => addDays(focusTarget, 1),
      ArrowUp: () => addDays(focusTarget, -7),
      ArrowDown: () => addDays(focusTarget, 7),
      PageUp: () => addMonths(focusTarget, -1),
      PageDown: () => addMonths(focusTarget, 1),
      Home: () => startOfWeek(focusTarget, { weekStartsOn }),
      End: () => endOfWeek(focusTarget, { weekStartsOn }),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    moveFocus(move());
  };

  return (
    <div className={cn("flex w-[280px] flex-col gap-2", className)}>
      <div className="flex items-center justify-between pl-2">
        <p id={captionId} className="font-display text-md font-semibold" aria-live="polite">
          {capitalize(format(visibleMonth, "LLLL yyyy", { locale: es }))}
        </p>
        <div className="flex items-center">
          <IconButton
            label={t("ui.previousMonth")}
            size="sm"
            onClick={() => changeMonth(addMonths(visibleMonth, -1))}
          >
            <ChevronLeft aria-hidden />
          </IconButton>
          <IconButton
            label={t("ui.nextMonth")}
            size="sm"
            onClick={() => changeMonth(addMonths(visibleMonth, 1))}
          >
            <ChevronRight aria-hidden />
          </IconButton>
        </div>
      </div>

      <div
        ref={gridRef}
        role="grid"
        aria-labelledby={captionId}
        onKeyDown={handleKeyDown}
        className="flex flex-col gap-0.5"
      >
        <div role="row" className="grid grid-cols-7">
          {weekdays.map((day) => (
            <span
              key={day.toISOString()}
              role="columnheader"
              aria-label={format(day, "EEEE", { locale: es })}
              className="flex h-[28px] items-center justify-center text-xs font-semibold text-text-muted"
            >
              {capitalize(format(day, "EEEEEE", { locale: es }))}
            </span>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={week[0].toISOString()} role="row" className="grid grid-cols-7">
            {week.map((day) => {
              const outside = !isSameMonth(day, visibleMonth);
              const isSelected = selected !== null && isSameDay(day, selected);
              const isToday = isSameDay(day, today);
              const isTarget = isSameDay(day, focusTarget);
              const disabled = isDisabled(day);
              return (
                <div
                  key={day.toISOString()}
                  role="gridcell"
                  aria-selected={isSelected}
                  aria-disabled={disabled || undefined}
                  className="flex justify-center"
                >
                  <button
                    type="button"
                    tabIndex={isTarget ? 0 : -1}
                    data-focus-target={isTarget}
                    disabled={disabled}
                    aria-current={isToday ? "date" : undefined}
                    aria-label={format(day, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
                    onClick={() => {
                      setFocused(day);
                      if (outside) changeMonth(day);
                      onSelect?.(day);
                    }}
                    className={cn(
                      "relative flex size-[36px] flex-col items-center justify-center rounded-full text-sm",
                      "transition-colors duration-(--dur-fast) ease-(--ease-soft)",
                      "disabled:pointer-events-none disabled:opacity-35",
                      isSelected
                        ? "bg-accent font-bold text-on-accent"
                        : isToday
                          ? "font-bold text-text shadow-[inset_0_0_0_1.5px_var(--accent)] hover:bg-accent-soft"
                          : "hover:bg-surface-hover",
                      !isSelected && outside && "text-text-faint",
                      focusRing,
                    )}
                  >
                    <span className="leading-none">{format(day, "d")}</span>
                    {renderDay ? (
                      <span className="absolute bottom-[3px] flex h-[5px] items-center gap-0.5">
                        {renderDay(day)}
                      </span>
                    ) : null}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
