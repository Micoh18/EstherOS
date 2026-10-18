import type { ComponentProps } from "react";
import type { VariantProps } from "class-variance-authority";
import { cn } from "./cn";
import { skeletonVariants } from "./variants";

export interface SkeletonProps
  extends ComponentProps<"span">, VariantProps<typeof skeletonVariants> {}

/** Loading placeholder. Size it with className (e.g. `w-1/2`). */
export function Skeleton({ shape, className, ...props }: SkeletonProps) {
  return <span aria-hidden className={cn(skeletonVariants({ shape }), className)} {...props} />;
}
