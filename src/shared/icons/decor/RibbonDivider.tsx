import type { HTMLAttributes } from "react";
import { Bow } from "./Bow";

export interface RibbonDividerProps extends HTMLAttributes<HTMLDivElement> {
  /** Height of the bow in the middle, in px. Defaults to 20. */
  size?: number;
}

function Wave({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 120 8"
      preserveAspectRatio="none"
      aria-hidden
      focusable={false}
      style={{ flex: 1, height: 8, transform: flip ? "scaleX(-1)" : undefined }}
    >
      <path
        d="M0 4c10 0 10-3 20-3s10 6 20 6 10-6 20-6 10 6 20 6 10-6 20-6 10 3 20 3"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Horizontal separator: two soft waves tied with a bow. Inherits currentColor. */
export function RibbonDivider({ size = 20, style, ...props }: RibbonDividerProps) {
  return (
    <div
      role="separator"
      style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", ...style }}
      {...props}
    >
      <Wave />
      <Bow size={size} />
      <Wave flip />
    </div>
  );
}
