import type { SVGProps } from "react";

export interface DecorProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  /** Width and height in px or any CSS length. Defaults to 24. */
  size?: number | string;
  /** Accessible name. Without it the decoration is hidden from assistive tech. */
  title?: string;
}

/** Shared SVG attributes: monochrome line art that inherits currentColor. */
export function decorSvgProps({ size = 24, title, ...rest }: DecorProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    role: title ? "img" : undefined,
    "aria-hidden": title ? undefined : true,
    focusable: false,
    ...rest,
  };
}
