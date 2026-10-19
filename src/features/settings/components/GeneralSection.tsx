import { useState } from "react";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { Input, Select } from "@/shared/ui";
import { t } from "@/shared/i18n";
import { useSettings } from "../hooks";
import { SettingsSchema, type Settings } from "../model";
import { SettingRow, SettingsSection } from "./SettingsLayout";
import { TagManager } from "./TagManager";

/** A known Sunday, so index 0..6 matches `week_starts_on`. */
const SUNDAY = new Date(2024, 0, 7);

const WEEKDAY_OPTIONS = Array.from({ length: 7 }, (_, day) => {
  const name = format(addDays(SUNDAY, day), "EEEE", { locale: es });
  return { value: String(day), label: name.charAt(0).toUpperCase() + name.slice(1) };
});

const TIME_OPTIONS = [
  { value: "24h", label: t("settings.general.timeFormat.24h") },
  { value: "12h", label: t("settings.general.timeFormat.12h") },
];

const VIEW_OPTIONS = [
  { value: "month", label: t("calendar.view.month") },
  { value: "week", label: t("calendar.view.week") },
  { value: "day", label: t("calendar.view.day") },
];

const START_OPTIONS = [
  { value: "today", label: t("settings.general.startScreen.today") },
  { value: "last", label: t("settings.general.startScreen.last") },
];

/** Same limit as `user_name` in SettingsSchema. */
const NAME_MAX = 60;

function NameField({ value, onSave }: { value: string; onSave: (name: string) => void }) {
  const [draft, setDraft] = useState(value);
  const commit = () => {
    const name = draft.trim();
    if (name !== value) onSave(name);
  };
  return (
    <Input
      id="settings-user-name"
      value={draft}
      maxLength={NAME_MAX}
      placeholder={t("settings.general.namePlaceholder")}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit();
      }}
      className="w-[240px]"
    />
  );
}

export function GeneralSection() {
  const { settings, update } = useSettings();
  const select =
    <K extends keyof Settings>(key: K, parse: (raw: string) => Settings[K]) =>
    (raw: string) =>
      void update(key, parse(raw));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SettingRow
          label={t("settings.general.name")}
          hint={t("settings.general.nameHint")}
          htmlFor="settings-user-name"
        >
          <NameField
            // Remount on outside changes (onboarding, import) so the draft follows them.
            key={settings.user_name}
            value={settings.user_name}
            onSave={(name) => void update("user_name", name)}
          />
        </SettingRow>
        <SettingRow label={t("settings.general.weekStart")}>
          <Select
            aria-label={t("settings.general.weekStart")}
            options={WEEKDAY_OPTIONS}
            value={String(settings.week_starts_on)}
            onValueChange={select("week_starts_on", Number)}
            className="w-[200px]"
          />
        </SettingRow>
        <SettingRow label={t("settings.general.timeFormat")}>
          <Select
            aria-label={t("settings.general.timeFormat")}
            options={TIME_OPTIONS}
            value={settings.time_format}
            onValueChange={select("time_format", (raw) => (raw === "12h" ? "12h" : "24h"))}
            className="w-[200px]"
          />
        </SettingRow>
        <SettingRow label={t("settings.general.calendarView")}>
          <Select
            aria-label={t("settings.general.calendarView")}
            options={VIEW_OPTIONS}
            value={settings.default_calendar_view}
            onValueChange={select("default_calendar_view", (raw) =>
              SettingsSchema.shape.default_calendar_view.parse(raw),
            )}
            className="w-[200px]"
          />
        </SettingRow>
        <SettingRow label={t("settings.general.startScreen")}>
          <Select
            aria-label={t("settings.general.startScreen")}
            options={START_OPTIONS}
            value={settings.start_screen}
            onValueChange={select("start_screen", (raw) => (raw === "last" ? "last" : "today"))}
            className="w-[200px]"
          />
        </SettingRow>
      </div>

      <SettingsSection title={t("settings.tags.title")} description={t("settings.tags.hint")}>
        <TagManager />
      </SettingsSection>
    </div>
  );
}
