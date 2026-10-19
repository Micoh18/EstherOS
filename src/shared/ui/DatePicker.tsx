import { useRef, useState } from "react";
import { format, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Button } from "./Button";
import { cn } from "./cn";
import { fieldVariants } from "./variants";
import { MonthGrid } from "./MonthGrid";
import { PopoverContent } from "./Popover";
import { uiStrings } from "./strings";

export interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  /** date-fns pattern for the trigger. Defaults to "d MMM yyyy" (18 oct 2026). */
  displayFormat?: string;
  weekStartsOn?: 0 | 1;
  minDate?: Date;
  maxDate?: Date;
  /** Shows the "Quitar" action. Defaults to true. */
  clearable?: boolean;
  size?: "sm" | "md";
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  className?: string;
}

/** Date field that opens a MonthGrid in a popover. Returns dates at local midnight. */
export function DatePicker({
  value,
  onChange,
  placeholder = uiStrings.pickDate,
  displayFormat = "d MMM yyyy",
  weekStartsOn = 1,
  minDate,
  maxDate,
  clearable = true,
  size = "md",
  disabled,
  id,
  className,
  ...props
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const pick = (date: Date | null) => {
    onChange(date ? startOfDay(date) : null);
    setOpen(false);
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
        <CalendarDays aria-hidden className="text-text-muted" />
        <span className="truncate">
          {value ? format(value, displayFormat, { locale: es }) : placeholder}
        </span>
      </PopoverPrimitive.Trigger>
      <PopoverContent
        ref={contentRef}
        aria-label={uiStrings.pickDate}
        // Start on the selected day (or today), not on the "previous month" button.
        onOpenAutoFocus={(event) => {
          const day = contentRef.current?.querySelector<HTMLElement>('[data-focus-target="true"]');
          if (!day) return;
          event.preventDefault();
          day.focus();
        }}
        className="p-3"
      >
        <MonthGrid
          selected={value}
          onSelect={pick}
          weekStartsOn={weekStartsOn}
          minDate={minDate}
          maxDate={maxDate}
        />
        <div className="mt-2 flex justify-between border-t border-border pt-2">
          <Button variant="ghost" size="sm" onClick={() => pick(new Date())}>
            {uiStrings.today}
          </Button>
          {clearable && value ? (
            <Button variant="ghost" size="sm" onClick={() => pick(null)}>
              {uiStrings.clear}
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </PopoverPrimitive.Root>
  );
}
