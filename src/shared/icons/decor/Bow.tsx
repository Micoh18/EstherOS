import { decorSvgProps, type DecorProps } from "./types";

export function Bow({ title, ...props }: DecorProps) {
  return (
    <svg {...decorSvgProps({ title, ...props })}>
      {title ? <title>{title}</title> : null}
      <path d="M12 10.5C9.6 7.4 5.3 5.6 3.8 7.3c-1.5 1.8.4 5.4 2.6 5.9 2 .5 4.2-.9 5.6-2.7Z" />
      <path d="M12 10.5c2.4-3.1 6.7-4.9 8.2-3.2 1.5 1.8-.4 5.4-2.6 5.9-2 .5-4.2-.9-5.6-2.7Z" />
      <path d="M10.9 11.6 8.4 18.6l1.9-.9 1 1.6 1-6.9" />
      <path d="M13.1 11.6l2.5 7-1.9-.9-1 1.6" />
      <ellipse cx="12" cy="10.8" rx="1.5" ry="1.7" />
    </svg>
  );
}
