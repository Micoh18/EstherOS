import type { ComponentProps } from "react";
import type { VariantProps } from "class-variance-authority";
import { iconButtonVariants } from "./variants";
import { cn } from "./cn";

export interface IconButtonProps
  extends Omit<ComponentProps<"button">, "aria-label">, VariantProps<typeof iconButtonVariants> {
  /** Accessible name; icon-only buttons must have one. */
  label: string;
}

export function IconButton({
  label,
  variant,
  size,
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
