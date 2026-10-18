import type { ButtonHTMLAttributes } from "react";

// TODO(A1): replace with IconButton from @/shared/ui (and its Tooltip instead of `title`).
export function IconButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`inline-flex size-8 items-center justify-center rounded-full text-text-muted transition-colors duration-(--dur-fast) hover:bg-surface-hover hover:text-text focus-visible:shadow-(--shadow-glow) focus-visible:outline-none ${className}`}
      {...props}
    />
  );
}
