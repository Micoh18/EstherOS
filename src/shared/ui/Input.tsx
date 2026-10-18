import type { ComponentProps } from "react";
import type { VariantProps } from "class-variance-authority";
import { fieldVariants } from "./variants";
import { cn } from "./cn";

export interface InputProps
  extends Omit<ComponentProps<"input">, "size">, VariantProps<typeof fieldVariants> {}

export function Input({ size, className, type = "text", ...props }: InputProps) {
  return <input type={type} className={cn(fieldVariants({ size }), className)} {...props} />;
}
