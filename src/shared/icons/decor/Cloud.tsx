import { decorSvgProps, type DecorProps } from "./types";

export function Cloud({ title, ...props }: DecorProps) {
  return (
    <svg {...decorSvgProps({ title, ...props })}>
      {title ? <title>{title}</title> : null}
      <path d="M7.5 18h9.8a3.7 3.7 0 0 0 .4-7.4 5.3 5.3 0 0 0-10.1-1.1A4.3 4.3 0 0 0 7.5 18Z" />
    </svg>
  );
}
