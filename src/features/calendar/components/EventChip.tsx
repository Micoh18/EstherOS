import type { ComponentProps } from "react";
import { Repeat } from "lucide-react";
import { cn } from "@/shared/ui";
import { t } from "@/shared/i18n";
import { colorClasses, formatEventTime, formatTime, type TimeFormat } from "../format";
import type { EventOccurrence } from "../model";

export interface EventChipProps extends Omit<ComponentProps<"button">, "children"> {
  occurrence: EventOccurrence;
  /** `pill`: one line for month cells. `row`: time + title for lists (side panel, Today). */
  variant?: "pill" | "row";
  timeFormat?: TimeFormat;
}

/**
 * Compact event: palette color fill, dashed edge when it is a past log (registered after it
 * happened). Renders as a button so it can open the event popover. Text on the fill always uses
 * `--text`: `--text-muted` drops below 4.5:1 on the pastel fills of the Pink theme.
 */
export function EventChip({
  occurrence,
  variant = "pill",
  timeFormat = "24h",
  className,
  type = "button",
  ...props
}: EventChipProps) {
  const colors = colorClasses(occurrence.color);
  const label = [
    occurrence.title,
    formatEventTime(occurrence, timeFormat),
    occurrence.isPastLog ? t("calendar.pastLog") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  if (variant === "row") {
    return (
      <button
        type={type}
        aria-label={label}
        data-past-log={occurrence.isPastLog || undefined}
        className={cn(
          "flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left text-sm text-text",
          "transition-[box-shadow,transform] duration-(--dur-fast) ease-(--ease-soft)",
          "outline-none hover:shadow-(--shadow-sm) focus-visible:shadow-(--shadow-glow)",
          colors.fill,
          occurrence.isPastLog ? cn("border-dashed", colors.edge) : "border-transparent",
          className,
        )}
        {...props}
      >
        <span className="w-[86px] shrink-0 font-mono text-xs leading-5 text-text">
          {occurrence.allDay || !occurrence.startAt
            ? t("calendar.allDay")
            : formatTime(occurrence.startAt, timeFormat)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{occurrence.title}</span>
          {occurrence.location ? (
            <span className="block truncate text-xs text-text">{occurrence.location}</span>
          ) : null}
        </span>
        {occurrence.isRecurring ? (
          <Repeat aria-hidden className="mt-0.5 size-[14px] shrink-0 text-text" />
        ) : null}
      </button>
    );
  }

  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      data-past-log={occurrence.isPastLog || undefined}
      className={cn(
        "flex h-[22px] w-full min-w-0 items-center gap-1 rounded-full border px-2 text-left text-xs font-semibold text-text",
        "outline-none focus-visible:shadow-(--shadow-glow)",
        colors.fill,
        occurrence.isPastLog ? cn("border-dashed", colors.edge) : "border-transparent",
        className,
      )}
      {...props}
    >
      {!occurrence.allDay && occurrence.startAt ? (
        <span className="shrink-0 font-mono text-[11px] font-normal text-text">
          {formatTime(occurrence.startAt, timeFormat)}
        </span>
      ) : null}
      <span className="truncate">{occurrence.title}</span>
    </button>
  );
}
