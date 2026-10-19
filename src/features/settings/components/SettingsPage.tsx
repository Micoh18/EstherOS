import { useState } from "react";
import {
  Database,
  Info,
  Keyboard,
  Palette,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/shared/ui";
import { t, type I18nKey } from "@/shared/i18n";
import { AboutSection } from "./AboutSection";
import { AppearanceSection } from "./AppearanceSection";
import { DataSection } from "./DataSection";
import { GeneralSection } from "./GeneralSection";
import { ShortcutsSection } from "./ShortcutsSection";

export type SettingsSectionId = "appearance" | "general" | "data" | "shortcuts" | "about";

const SECTIONS: readonly {
  id: SettingsSectionId;
  labelKey: I18nKey;
  icon: LucideIcon;
  Component: () => React.JSX.Element;
}[] = [
  {
    id: "appearance",
    labelKey: "settings.section.appearance",
    icon: Palette,
    Component: AppearanceSection,
  },
  {
    id: "general",
    labelKey: "settings.section.general",
    icon: SlidersHorizontal,
    Component: GeneralSection,
  },
  { id: "data", labelKey: "settings.section.data", icon: Database, Component: DataSection },
  {
    id: "shortcuts",
    labelKey: "settings.section.shortcuts",
    icon: Keyboard,
    Component: ShortcutsSection,
  },
  { id: "about", labelKey: "settings.section.about", icon: Info, Component: AboutSection },
];

export interface SettingsPageProps {
  initialSection?: SettingsSectionId;
}

/** Settings screen with its own section sidebar. */
export function SettingsPage({ initialSection = "appearance" }: SettingsPageProps) {
  const [active, setActive] = useState<SettingsSectionId>(initialSection);
  const section = SECTIONS.find((entry) => entry.id === active) ?? SECTIONS[0];
  const { Component } = section;

  return (
    <div className="relative flex h-full min-h-0">
      <nav
        aria-label={t("settings.nav.label")}
        className="flex w-[200px] shrink-0 flex-col gap-1 border-r border-border p-4"
      >
        <h1 className="mb-3 px-3 font-display text-2xl font-semibold">{t("settings.title")}</h1>
        {SECTIONS.map(({ id, labelKey, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-current={id === active ? "page" : undefined}
            onClick={() => setActive(id)}
            className={cn(
              "flex h-[38px] items-center gap-3 rounded-full px-3 text-left text-base outline-none",
              "transition-[background-color,color] duration-(--dur-fast) ease-(--ease-soft)",
              "focus-visible:shadow-(--shadow-glow)",
              id === active
                ? "bg-accent-soft font-semibold text-text"
                : "text-text-muted hover:bg-surface-hover hover:text-text",
            )}
          >
            <Icon size={18} strokeWidth={1.75} aria-hidden />
            {t(labelKey)}
          </button>
        ))}
      </nav>
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-6 py-6">
          <h2 className="font-display text-xl font-semibold">{t(section.labelKey)}</h2>
          <Component />
        </div>
      </div>
    </div>
  );
}
