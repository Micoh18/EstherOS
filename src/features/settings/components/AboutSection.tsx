import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { Bow, Heart } from "@/shared/icons";
import { log } from "@/shared/lib/log";
import { t } from "@/shared/i18n";
import { SettingsSection } from "./SettingsLayout";

const FONTS = [
  { name: "Fraunces", copyright: "© 2020 The Fraunces Project Authors" },
  { name: "Nunito", copyright: "© 2014 The Nunito Project Authors" },
  { name: "JetBrains Mono", copyright: "© 2020 The JetBrains Mono Project Authors" },
];

/** Version from tauri.conf.json, read through the app API. */
function useAppVersion(): string | null {
  const [version, setVersion] = useState<string | null>(null);
  useEffect(() => {
    getVersion().then(setVersion, (error: unknown) => log.warn("app version", error));
  }, []);
  return version;
}

export function AboutSection() {
  const version = useAppVersion();
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4 rounded-lg border border-border bg-surface p-5">
        <Bow size={40} className="shrink-0 text-accent" />
        <div className="flex flex-col gap-1">
          <p className="font-display text-xl font-semibold">{t("app.name")}</p>
          <p className="text-sm text-text-muted">
            {t("settings.about.version", { version: version ?? t("settings.data.unknown") })}
          </p>
          <p className="text-sm">{t("settings.about.tagline")}</p>
        </div>
      </div>

      <p className="flex items-start gap-2 text-sm text-text-muted">
        <Heart size={16} className="mt-[2px] shrink-0 text-accent" />
        {t("settings.about.privacy")}
      </p>

      <SettingsSection title={t("settings.about.credits")}>
        <div className="flex flex-col gap-4 text-sm">
          <div>
            <h4 className="mb-1 font-semibold">{t("settings.about.fonts")}</h4>
            <ul className="flex flex-col gap-1 text-text-muted">
              {FONTS.map((font) => (
                <li key={font.name}>
                  <span className="font-semibold text-text">{font.name}</span> · {font.copyright} ·{" "}
                  {t("settings.about.fontsLicense")}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-1 font-semibold">{t("settings.about.icons")}</h4>
            <ul className="flex flex-col gap-1 text-text-muted">
              <li>{t("settings.about.lucide")}</li>
              <li>{t("settings.about.decor")}</li>
            </ul>
          </div>
          <p className="text-text-muted">{t("settings.about.builtWith")}</p>
        </div>
      </SettingsSection>
    </div>
  );
}
