import type { ReactNode } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "./cn";
import { Kbd } from "./Kbd";

/** Optional app-level provider to share the open delay between tooltips. */
export const TooltipProvider = TooltipPrimitive.Provider;

export interface TooltipProps {
  /** Trigger element. Must accept a ref (any DOM element or design system control). */
  children: ReactNode;
  content: ReactNode;
  /** Keyboard combination shown next to the text, e.g. formatBinding(actionId). */
  shortcut?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delayDuration?: number;
  className?: string;
}

/** Self-contained tooltip: works with or without a TooltipProvider above it. */
export function Tooltip({
  children,
  content,
  shortcut,
  side = "bottom",
  align = "center",
  delayDuration = 400,
  className,
}: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={6}
            className={cn(
              "ui-pop z-50 flex origin-(--radix-tooltip-content-transform-origin) items-center gap-2",
              "rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text shadow-(--shadow-md)",
              className,
            )}
          >
            <span>{content}</span>
            {shortcut ? <Kbd combo={shortcut} size="sm" /> : null}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
