import type { ComponentProps } from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cva, type VariantProps } from "class-variance-authority";
import { cn, focusRing } from "./cn";

const trackVariants = cva(
  [
    "group inline-flex shrink-0 items-center rounded-full p-[3px]",
    "bg-text-faint data-[state=checked]:bg-accent",
    "transition-[background-color,box-shadow] duration-(--dur-base) ease-(--ease-soft)",
    "disabled:cursor-not-allowed disabled:opacity-50",
    focusRing,
  ],
  {
    variants: {
      size: {
        sm: "h-[20px] w-[34px]",
        md: "h-[24px] w-[42px]",
      },
    },
    defaultVariants: { size: "md" },
  },
);

const thumbVariants = cva(
  [
    "block rounded-full bg-surface shadow-(--shadow-md)",
    "transition-[translate] duration-(--dur-base) ease-(--ease-soft) motion-reduce:transition-none",
  ],
  {
    variants: {
      size: {
        sm: "size-[14px] data-[state=checked]:translate-x-[14px]",
        md: "size-[18px] data-[state=checked]:translate-x-[18px]",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface SwitchProps
  extends ComponentProps<typeof SwitchPrimitive.Root>, VariantProps<typeof trackVariants> {}

export function Switch({ size, className, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root className={cn(trackVariants({ size }), className)} {...props}>
      <SwitchPrimitive.Thumb className={thumbVariants({ size })} />
    </SwitchPrimitive.Root>
  );
}
