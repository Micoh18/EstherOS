import { decorSvgProps, type DecorProps } from "./types";

export function Sparkle({ title, ...props }: DecorProps) {
  return (
    <svg {...decorSvgProps({ title, ...props })}>
      {title ? <title>{title}</title> : null}
      <path d="M11 4c.5 4.4 2.6 6.5 7 7-4.4.5-6.5 2.6-7 7-.5-4.4-2.6-6.5-7-7 4.4-.5 6.5-2.6 7-7Z" />
      <path d="M19 2.5c.2 1.5.9 2.2 2.5 2.5-1.6.3-2.3 1-2.5 2.5-.2-1.5-.9-2.2-2.5-2.5 1.6-.3 2.3-1 2.5-2.5Z" />
    </svg>
  );
}
