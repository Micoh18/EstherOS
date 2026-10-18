import type { ComponentProps } from "react";
import type { VariantProps } from "class-variance-authority";
import { cardVariants } from "./variants";
import { cn } from "./cn";

export interface CardProps extends ComponentProps<"div">, VariantProps<typeof cardVariants> {}

export function Card({ variant, padding, className, ...props }: CardProps) {
  return <div className={cn(cardVariants({ variant, padding }), className)} {...props} />;
}
