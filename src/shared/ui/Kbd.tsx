import type { ComponentProps } from "react";
import type { VariantProps } from "class-variance-authority";
import { cn } from "./cn";
import { splitCombo } from "./combo";
import { kbdKeyVariants } from "./variants";

export interface KbdProps
  extends Omit<ComponentProps<"kbd">, "children">, VariantProps<typeof kbdKeyVariants> {
  /** Display string such as the output of formatBinding(): "Ctrl+Shift+T". */
  combo?: string;
  /** Explicit list of keys; wins over `combo`. */
  keys?: string[];
}

/** Keyboard combination rendered as pills, one per key. */
export function Kbd({ combo = "", keys, size, className, ...props }: KbdProps) {
  const parts = keys ?? splitCombo(combo);
  return (
    <kbd className={cn("inline-flex items-center gap-1 font-sans", className)} {...props}>
      {parts.map((key, index) => (
        <kbd key={`${key}-${index}`} className={kbdKeyVariants({ size })}>
          {key}
        </kbd>
      ))}
    </kbd>
  );
}
