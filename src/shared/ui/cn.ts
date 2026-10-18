import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Joins class names and resolves Tailwind conflicts: the last utility of a group wins. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Focus ring shared by every interactive component. */
export const focusRing = "outline-none focus-visible:shadow-(--shadow-glow)";
