import type { ComponentProps } from "react";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "./variants";
import { cn } from "./cn";

export interface ButtonProps
  extends ComponentProps<"button">, VariantProps<typeof buttonVariants> {}

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
