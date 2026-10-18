import { useScope, type Scope } from "@/shared/hotkeys";
import { t, type I18nKey } from "@/shared/i18n";

/** Empty screen until the feature lands. Activates the screen's hotkey scope. */
export function PlaceholderPage({ titleKey, scope }: { titleKey: I18nKey; scope?: Scope }) {
  useScope(scope ?? "global", scope !== undefined);
  return (
    <section className="flex h-full flex-col gap-2 p-8">
      <h1 className="font-display text-3xl text-text">{t(titleKey)}</h1>
      <p className="text-text-muted">{t("shell.page.placeholder")}</p>
    </section>
  );
}
