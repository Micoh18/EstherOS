import { clsx, type ClassValue } from "clsx";

/** Joins class names. No Tailwind conflict resolution: pass non-conflicting overrides. */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Focus ring shared by every interactive component. */
export const focusRing = "outline-none focus-visible:shadow-(--shadow-glow)";
