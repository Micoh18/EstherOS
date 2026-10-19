import { useEffect, useState } from "react";
import { addDays, startOfDay } from "date-fns";
import { todayISO, type DateISO } from "./dates";

/** Extra delay after midnight so the new day has surely started when the timer fires. */
const MIDNIGHT_SLACK_MS = 1_000;

/** Milliseconds from `now` until the next local midnight. */
export function msUntilNextMidnight(now: Date): number {
  return addDays(startOfDay(now), 1).getTime() - now.getTime();
}

/**
 * The current local day, the single source of "today" for every screen. Recalculates with a
 * timer at midnight, rescheduled on every firing (even when the day did not change because the
 * clock moved), and whenever the window gets the focus back or becomes visible again (after
 * sleep, the timer may have fired late or not at all).
 */
export function useCurrentDay(): DateISO {
  const [day, setDay] = useState(() => todayISO());

  useEffect(() => {
    let timer = 0;
    const schedule = () => {
      timer = window.setTimeout(
        () => {
          setDay(todayISO());
          schedule();
        },
        msUntilNextMidnight(new Date()) + MIDNIGHT_SLACK_MS,
      );
    };
    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      setDay(todayISO());
      // The timer may be off after a sleep or a clock change: aim it at the real midnight again.
      window.clearTimeout(timer);
      schedule();
    };

    schedule();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return day;
}
