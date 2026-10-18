import type { ReactNode } from "react";
import { MonthGrid } from "@/shared/ui";
import { useCalendarSettings } from "../hooks";

export interface MiniCalendarProps {
  /** Visible month (controlled). Any date inside the month works. */
  month?: Date;
  defaultMonth?: Date;
  onMonthChange?: (month: Date) => void;
  selected?: Date | null;
  onSelect?: (date: Date) => void;
  /** Small indicators under the day number (mood dots, event markers…). */
  renderDay?: (date: Date) => ReactNode;
  className?: string;
}

/**
 * Compact monthly grid that follows the `week_starts_on` setting, with a render prop per day
 * for indicators. Used by the journal and Today.
 */
export function MiniCalendar(props: MiniCalendarProps) {
  const { weekStartsOn } = useCalendarSettings();
  // MonthGrid supports Sunday or Monday starts; other values fall back to Monday.
  return <MonthGrid {...props} weekStartsOn={weekStartsOn === 0 ? 0 : 1} />;
}
