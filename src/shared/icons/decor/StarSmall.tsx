import { decorSvgProps, type DecorProps } from "./types";

export function StarSmall({ title, ...props }: DecorProps) {
  return (
    <svg {...decorSvgProps({ title, ...props })}>
      {title ? <title>{title}</title> : null}
      <path d="m12 5 1.9 4.2 4.6.5-3.4 3.1 1 4.5L12 15l-4.1 2.3 1-4.5-3.4-3.1 4.6-.5L12 5Z" />
    </svg>
  );
}
