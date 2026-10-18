import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { requestJournalDate } from "@/features/journal";
import { getAllSettings } from "@/features/settings";
import { onDbChanged } from "@/shared/db";
import { todayISO, type DateISO } from "@/shared/lib/dates";
import { log } from "@/shared/lib/log";
import { msUntilNextMidnight } from "./model";

/** Extra delay after midnight so the new day has surely started when the timer fires. */
const MIDNIGHT_SLACK_MS = 1_000;
const CLOCK_TICK_MS = 60_000;

/**
 * The current local day. Recalculates with a timer at midnight (rescheduled every day) and
 * whenever the window gets the focus back or becomes visible again (after sleep, the timer may
 * have fired late or not at all).
 */
export function useCurrentDay(): DateISO {
  const [day, setDay] = useState(() => todayISO());

  useEffect(() => {
    const id = window.setTimeout(
      () => setDay(todayISO()),
      msUntilNextMidnight(new Date()) + MIDNIGHT_SLACK_MS,
    );
    return () => window.clearTimeout(id);
  }, [day]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "hidden") setDay(todayISO());
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return day;
}

/** Current time refreshed every minute and on focus (the greeting follows the hour). */
export function useClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = window.setInterval(tick, CLOCK_TICK_MS);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", tick);
    };
  }, []);
  return now;
}

export interface TodaySettings {
  userName: string;
  timeFormat: "12h" | "24h";
}

const DEFAULT_SETTINGS: TodaySettings = { userName: "", timeFormat: "24h" };

/** Settings Hoy depends on, reloaded when they change. Defaults until the first load. */
export function useTodaySettings(): TodaySettings {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [version, setVersion] = useState(0);

  useEffect(() => onDbChanged("setting", () => setVersion((v) => v + 1)), []);

  useEffect(() => {
    let cancelled = false;
    getAllSettings().then(
      (all) => {
        if (!cancelled) setSettings({ userName: all.user_name, timeFormat: all.time_format });
      },
      (error: unknown) => log.error("today: settings load failed", error),
    );
    return () => {
      cancelled = true;
    };
  }, [version]);

  return settings;
}

/** Opens the journal on `day`: its latest entry, or a fresh draft. */
export function useOpenJournal(day: DateISO): () => void {
  const navigate = useNavigate();
  return useCallback(() => {
    requestJournalDate(day);
    navigate("/journal");
  }, [day, navigate]);
}
