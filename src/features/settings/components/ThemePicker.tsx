import { Check } from "lucide-react";
import { cn, onRadioGroupKeyDown, radioTabIndex } from "@/shared/ui";
import { t } from "@/shared/i18n";
import type { ThemeName } from "@/shared/theme";
import { THEMES, type ThemeSetting } from "../model";

/** Miniature of the app (title bar, sidebar, a card and the accent) drawn with the theme's tokens. */
function MiniApp({ theme, className }: { theme: ThemeName; className?: string }) {
  return (
    <div
      aria-hidden
      // The theme selectors also match any element, so the miniature paints with its tokens.
      data-theme={theme}
      className={cn("flex h-full flex-col overflow-hidden bg-bg", className)}
    >
      <div className="flex h-[10px] items-center gap-[3px] bg-bg-elevated px-[6px]">
        <span className="size-[4px] rounded-full bg-accent" />
        <span className="h-[3px] w-[24px] rounded-full bg-text-faint" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex w-[22%] flex-col gap-[4px] bg-bg-elevated p-[5px]">
          <span className="h-[4px] w-full rounded-full bg-accent" />
          <span className="h-[4px] w-3/4 rounded-full bg-text-faint" />
          <span className="h-[4px] w-3/4 rounded-full bg-text-faint" />
          <span className="h-[4px] w-2/3 rounded-full bg-text-faint" />
        </div>
        <div className="flex flex-1 flex-col gap-[5px] p-[6px]">
          <span className="h-[6px] w-1/2 rounded-full bg-text" />
          <div className="flex flex-1 flex-col gap-[4px] rounded-[6px] border border-border bg-surface p-[5px]">
            <span className="h-[4px] w-4/5 rounded-full bg-text-muted" />
            <span className="h-[4px] w-3/5 rounded-full bg-text-faint" />
            <div className="mt-auto flex gap-[3px]">
              <span className="h-[6px] w-[18px] rounded-full bg-palette-rose" />
              <span className="h-[6px] w-[18px] rounded-full bg-palette-sage" />
              <span className="ml-auto h-[8px] w-[22px] rounded-full bg-accent" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Preview({ theme }: { theme: ThemeSetting }) {
  if (theme !== "system") return <MiniApp theme={theme} />;
  return (
    <div className="relative h-full">
      <MiniApp theme="white" className="absolute inset-0 [clip-path:polygon(0_0,100%_0,0_100%)]" />
      <MiniApp
        theme="dark"
        className="absolute inset-0 [clip-path:polygon(100%_0,100%_100%,0_100%)]"
      />
    </div>
  );
}

export interface ThemePickerProps {
  value: ThemeSetting;
  onChange: (theme: ThemeSetting) => void;
  className?: string;
}

const ORDER: readonly ThemeSetting[] = ["pink", "white", "dark", "system"];

/** Three theme previews plus "Sistema". The active one has an accent border and a check. */
export function ThemePicker({ value, onChange, className }: ThemePickerProps) {
  const themes = ORDER.filter((theme) => THEMES.includes(theme));
  return (
    <div
      role="radiogroup"
      aria-label={t("settings.appearance.theme")}
      onKeyDown={onRadioGroupKeyDown}
      className={cn("grid grid-cols-2 gap-4 sm:grid-cols-4", className)}
    >
      {themes.map((theme, index) => {
        const active = theme === value;
        return (
          <button
            key={theme}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={radioTabIndex(active, index, themes.includes(value))}
            onClick={() => onChange(theme)}
            className={cn(
              "group flex flex-col gap-2 rounded-lg border-2 bg-surface p-2 text-left outline-none",
              "transition-[border-color,box-shadow] duration-(--dur-fast) ease-(--ease-soft)",
              "focus-visible:shadow-(--shadow-glow)",
              active ? "border-accent" : "border-border hover:border-text-faint",
            )}
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-border">
              <Preview theme={theme} />
              {active ? (
                <span className="absolute top-[6px] right-[6px] flex size-[20px] items-center justify-center rounded-full bg-accent text-on-accent shadow-(--shadow-sm)">
                  <Check size={12} strokeWidth={3} aria-hidden />
                </span>
              ) : null}
            </div>
            <span className="px-1 text-sm font-semibold">{t(`theme.${theme}`)}</span>
            {theme === "system" ? (
              <span className="px-1 text-xs text-text-muted">
                {t("settings.appearance.systemHint")}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
