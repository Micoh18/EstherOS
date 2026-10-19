import { useId, type ReactNode } from "react";
import { cn } from "@/shared/ui";

export function SettingsSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={cn("flex flex-col gap-4", className)}>
      <div>
        <h3 id={id} className="font-display text-lg font-semibold">
          {title}
        </h3>
        {description ? <p className="text-sm text-text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Label + hint on the left, control on the right; stacks on narrow widths. */
export function SettingRow({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-border py-3 last:border-b-0">
      <div className="flex min-w-[200px] flex-1 flex-col">
        <label htmlFor={htmlFor} className="text-base font-semibold">
          {label}
        </label>
        {hint ? <span className="text-sm text-text-muted">{hint}</span> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}
