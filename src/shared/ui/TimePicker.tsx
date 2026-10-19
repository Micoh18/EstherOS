import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { addMinutes, format, isValid, parse, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Clock } from "lucide-react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn, focusRing } from "./cn";
import { fieldVariants } from "./variants";
import { PopoverContent } from "./Popover";
import { t } from "@/shared/i18n";

export interface TimePickerProps {
  /** "HH:mm" (24 h) or null. */
  value: string | null;
  onChange: (time: string) => void;
  /** Minutes between options. Defaults to 15. */
  step?: number;
  /** Display only; the value is always "HH:mm". Setting `time_format`. */
  hourCycle?: 12 | 24;
  placeholder?: string;
  size?: "sm" | "md";
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  className?: string;
}

const VALUE_FORMAT = "HH:mm";

function toDate(time: string, base: Date) {
  const date = parse(time, VALUE_FORMAT, base);
  return isValid(date) ? date : null;
}

/** Time field with a scrollable list of options in a popover. */
export function TimePicker({
  value,
  onChange,
  step = 15,
  hourCycle = 24,
  placeholder = t("ui.pickTime"),
  size = "md",
  disabled,
  id,
  className,
  ...props
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const displayFormat = hourCycle === 12 ? "h:mm aaaa" : VALUE_FORMAT;

  const options = useMemo(() => {
    const base = startOfDay(new Date());
    const times: string[] = [];
    for (let minutes = 0; minutes < 24 * 60; minutes += step) {
      times.push(format(addMinutes(base, minutes), VALUE_FORMAT));
    }
    if (value && !times.includes(value)) times.push(value);
    return times.sort().map((time) => ({
      value: time,
      label: format(toDate(time, base) ?? base, displayFormat, { locale: es }),
    }));
  }, [step, value, displayFormat]);

  const selectedDate = value ? toDate(value, new Date()) : null;

  const focusOption = (index: number) => {
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>("[role=option]");
    if (!buttons?.length) return;
    buttons[Math.max(0, Math.min(buttons.length - 1, index))].focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>("[role=option]") ?? [],
    );
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const moves: Record<string, number> = {
      ArrowDown: current + 1,
      ArrowUp: current - 1,
      Home: 0,
      End: buttons.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    focusOption(moves[event.key]);
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger
        id={id}
        disabled={disabled}
        aria-label={props["aria-label"]}
        className={cn(
          fieldVariants({ size }),
          "inline-flex items-center gap-2 text-left [&_svg]:size-4 [&_svg]:shrink-0",
          !value && "text-text-faint",
          className,
        )}
      >
        <Clock aria-hidden className="text-text-muted" />
        <span className="truncate">
          {selectedDate ? format(selectedDate, displayFormat, { locale: es }) : placeholder}
        </span>
      </PopoverPrimitive.Trigger>
      <PopoverContent
        className="w-[160px] p-1"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          const selected =
            listRef.current?.querySelector<HTMLButtonElement>("[aria-selected=true]");
          const target =
            selected ?? listRef.current?.querySelector<HTMLButtonElement>("[role=option]");
          target?.scrollIntoView?.({ block: "center" });
          target?.focus();
        }}
      >
        <div
          ref={listRef}
          role="listbox"
          aria-label={props["aria-label"] ?? placeholder}
          onKeyDown={handleKeyDown}
          className="flex max-h-[240px] flex-col gap-0.5 overflow-y-auto"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex h-[32px] shrink-0 items-center rounded-sm px-3 font-mono text-sm",
                  isSelected
                    ? "bg-accent font-semibold text-on-accent"
                    : "text-text hover:bg-surface-hover",
                  focusRing,
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </PopoverPrimitive.Root>
  );
}
