import { decorSvgProps, type DecorProps } from "./types";

export interface HeartProps extends DecorProps {
  /** Solid heart (e.g. active favorite). */
  filled?: boolean;
}

export function Heart({ title, filled = false, ...props }: HeartProps) {
  return (
    <svg {...decorSvgProps({ title, ...props })}>
      {title ? <title>{title}</title> : null}
      <path
        d="M12 19.5s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10Z"
        fill={filled ? "currentColor" : "none"}
      />
    </svg>
  );
}
