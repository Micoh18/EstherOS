import { useCallback, useEffect, useState } from "react";
import { onDbChanged } from "@/shared/db";
import { log } from "@/shared/lib/log";
import { SETTING_DEFAULTS, type SettingKey, type Settings } from "./model";
import { saveSetting } from "./persistence";
import { getAllSettings } from "./repository";

export interface SettingsState {
  settings: Settings;
  loaded: boolean;
  /** Optimistic update: the UI changes at once and the value is saved in the background. */
  update: <K extends SettingKey>(key: K, value: Settings[K]) => Promise<void>;
}

/** All settings, reloaded whenever the `setting` table changes. */
export function useSettings(): SettingsState {
  const [settings, setSettings] = useState<Settings>(SETTING_DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const load = () => {
      getAllSettings().then(
        (value) => {
          if (!active) return;
          setSettings(value);
          setLoaded(true);
        },
        (error: unknown) => log.warn("Could not load settings", error),
      );
    };
    load();
    const off = onDbChanged("setting", load);
    return () => {
      active = false;
      off();
    };
  }, []);

  const update = useCallback(<K extends SettingKey>(key: K, value: Settings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    return saveSetting(key, value);
  }, []);

  return { settings, loaded, update };
}
