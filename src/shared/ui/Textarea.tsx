import type { ComponentProps } from "react";
import { cn } from "./cn";
import { fieldVariants } from "./variants";

export type TextareaProps = ComponentProps<"textarea">;

export function Textarea({ className, rows = 4, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={cn(fieldVariants(), "h-auto min-h-[88px] resize-y py-3 leading-normal", className)}
      {...props}
    />
  );
}
