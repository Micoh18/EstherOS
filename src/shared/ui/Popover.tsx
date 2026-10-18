import type { ComponentProps } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "./cn";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverClose = PopoverPrimitive.Close;

/** Floating surface shared by Popover, Select and the pickers. */
export const floatingSurfaceClass =
  "ui-pop z-50 rounded-md border border-border bg-surface text-text shadow-(--shadow-lg) outline-none";

export function PopoverContent({
  className,
  sideOffset = 8,
  align = "start",
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          floatingSurfaceClass,
          "origin-(--radix-popover-content-transform-origin) p-3",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
