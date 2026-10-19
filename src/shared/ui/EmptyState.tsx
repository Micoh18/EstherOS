import type { ComponentProps, ReactNode } from "react";
import { Sparkle } from "@/shared/icons";
import { cn } from "./cn";
import { t } from "@/shared/i18n";

export interface EmptyStateProps extends Omit<ComponentProps<"div">, "title"> {
  /** Decorative illustration; defaults to a sparkle. */
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  /** Optional call to action (e.g. a Button). */
  action?: ReactNode;
  size?: "sm" | "md";
}

export function EmptyState({
  icon,
  title = t("ui.emptyTitle"),
  description,
  action,
  size = "md",
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "md" ? "gap-3 px-5 py-7" : "gap-2 px-4 py-5",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-accent-soft text-accent",
          size === "md" ? "size-[64px]" : "size-[44px]",
        )}
      >
        {icon ?? <Sparkle size={size === "md" ? 30 : 22} />}
      </div>
      <p className={cn("font-display font-semibold", size === "md" ? "text-lg" : "text-md")}>
        {title}
      </p>
      {description ? <p className="max-w-[320px] text-sm text-text-muted">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
