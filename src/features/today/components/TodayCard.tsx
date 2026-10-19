import { useId, type ReactNode } from "react";
import { t } from "@/shared/i18n";
import { Card, cn, Skeleton } from "@/shared/ui";

interface TodayCardProps {
  title: string;
  icon: ReactNode;
  /** Buttons on the right of the title. */
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Card of the Hoy screen: titled region with optional header actions and footer. */
export function TodayCard({ title, icon, actions, footer, children, className }: TodayCardProps) {
  const titleId = useId();
  return (
    <Card
      role="region"
      aria-labelledby={titleId}
      padding="none"
      className={cn("flex min-w-0 flex-col", className)}
    >
      <header className="flex min-h-[60px] items-center gap-2 px-5 pt-4 pb-3">
        <span aria-hidden className="text-accent [&_svg]:size-[18px]">
          {icon}
        </span>
        <h2 id={titleId} className="flex-1 font-display text-lg font-semibold">
          {title}
        </h2>
        {actions}
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-5 pb-4">{children}</div>
      {footer ? (
        <footer className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">
          {footer}
        </footer>
      ) : null}
    </Card>
  );
}

/** Placeholder rows while a card loads its first data. */
export function CardLoading({ rows = 2 }: { rows?: number }) {
  return (
    <div role="status" aria-label={t("today.loading")} className="flex flex-col gap-2">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-[40px]! rounded-md!" />
      ))}
    </div>
  );
}

/** Gentle message when a card could not load its data. */
export function CardError({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}
