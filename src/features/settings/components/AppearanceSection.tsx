import { useTheme } from "@/app/theme";
import { Switch, cn } from "@/shared/ui";
import { t, type I18nKey } from "@/shared/i18n";
import { setFontScale, setReduceMotion, useAppearanceStore } from "../appearance";
import { FONT_SCALES, type FontScale } from "../model";
import { SettingRow, SettingsSection } from "./SettingsLayout";
import { ThemePicker } from "./ThemePicker";

const FONT_LABELS: Record<FontScale, I18nKey> = {
  0.9: "settings.appearance.fontSize.small",
  1: "settings.appearance.fontSize.medium",
  1.1: "settings.appearance.fontSize.large",
};

const FONT_SAMPLE: Record<FontScale, string> = { 0.9: "text-sm", 1: "text-base", 1.1: "text-md" };

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const fontScale = useAppearanceStore((state) => state.fontScale);
  const reduceMotion = useAppearanceStore((state) => state.reduceMotion);

  return (
    <div className="flex flex-col gap-8">
      <SettingsSection
        title={t("settings.appearance.theme")}
        description={t("settings.appearance.themeHint")}
      >
        <ThemePicker value={theme} onChange={setTheme} />
      </SettingsSection>

      <div>
        <SettingRow label={t("settings.appearance.fontSize")}>
          <div
            role="radiogroup"
            aria-label={t("settings.appearance.fontSize")}
            className="inline-flex gap-1 rounded-full bg-bg-elevated p-1"
          >
            {FONT_SCALES.map((scale) => (
              <button
                key={scale}
                type="button"
                role="radio"
                aria-checked={fontScale === scale}
                onClick={() => setFontScale(scale)}
                className={cn(
                  "h-[32px] rounded-full px-4 font-semibold outline-none focus-visible:shadow-(--shadow-glow)",
                  "transition-[background-color,color] duration-(--dur-fast) ease-(--ease-soft)",
                  FONT_SAMPLE[scale],
                  fontScale === scale
                    ? "bg-surface text-text shadow-(--shadow-sm)"
                    : "text-text-muted hover:text-text",
                )}
              >
                {t(FONT_LABELS[scale])}
              </button>
            ))}
          </div>
        </SettingRow>
        <SettingRow
          label={t("settings.appearance.reduceMotion")}
          hint={t("settings.appearance.reduceMotionHint")}
          htmlFor="settings-reduce-motion"
        >
          <Switch
            id="settings-reduce-motion"
            checked={reduceMotion}
            onCheckedChange={setReduceMotion}
          />
        </SettingRow>
      </div>
    </div>
  );
}
