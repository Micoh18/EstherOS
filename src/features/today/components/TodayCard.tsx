import { useId, type ReactNode } from "react";
import { Card, cn } from "@/shared/ui";

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
