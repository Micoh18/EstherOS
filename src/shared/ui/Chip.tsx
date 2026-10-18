import type { ComponentProps, ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { chipVariants } from "./variants";
import { cn, focusRing } from "./cn";
import { uiStrings } from "./strings";

export type ChipColor = NonNullable<VariantProps<typeof chipVariants>["color"]>;

export interface ChipProps
  extends Omit<ComponentProps<"span">, "color" | "onClick">, VariantProps<typeof chipVariants> {
  icon?: ReactNode;
  /** Renders the chip as a toggle button (e.g. tag filters); `selected` sets aria-pressed. */
  onClick?: () => void;
  /** Shows a small remove button inside the chip. */
  onRemove?: () => void;
  removeLabel?: string;
}

export function Chip({
  color,
  size,
  selected,
  icon,
  onClick,
  onRemove,
  removeLabel = uiStrings.remove,
  className,
  children,
  ...props
}: ChipProps) {
  const classes = cn(chipVariants({ color, size, selected }), className);
  const content = (
    <>
      {icon}
      <span className="truncate">{children}</span>
    </>
  );

  if (onClick && !onRemove) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected ?? false}
        className={cn(classes, "cursor-pointer hover:brightness-[0.97]", focusRing)}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={classes} {...props}>
      {content}
      {onRemove ? (
        <button
          type="button"
          aria-label={removeLabel}
          onClick={onRemove}
          className={cn(
            "-mr-1 inline-flex size-4 items-center justify-center rounded-full text-text-muted hover:bg-surface hover:text-text",
            focusRing,
          )}
        >
          <X aria-hidden />
        </button>
      ) : null}
    </span>
  );
}
