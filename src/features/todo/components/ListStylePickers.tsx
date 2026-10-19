import { Ban } from "lucide-react";
import { COLOR_KEYS, type ColorKey } from "@/shared/db";
import { t } from "@/shared/i18n";
import { cn } from "@/shared/ui";
import { LIST_ICONS, LIST_ICON_KEYS, PALETTE_BG_CLASS, type ListIconKey } from "./listIcons";

const option = cn(
  "inline-flex size-[32px] items-center justify-center rounded-full outline-none",
  "transition-[box-shadow,scale] duration-(--dur-fast) ease-(--ease-soft)",
  "hover:scale-105 focus-visible:shadow-(--shadow-glow) motion-reduce:hover:scale-100",
);
const selectedRing = "shadow-[0_0_0_2px_var(--bg),0_0_0_4px_var(--accent)]";

export function ColorPicker({
  value,
  onChange,
}: {
  value: ColorKey | null;
  onChange: (color: ColorKey | null) => void;
}) {
  return (
    <div role="radiogroup" aria-label={t("todo.list.color")} className="flex flex-wrap gap-2">
      <button
        type="button"
        role="radio"
        aria-checked={value === null}
        aria-label={t("todo.list.noColor")}
        title={t("todo.list.noColor")}
        onClick={() => onChange(null)}
        className={cn(option, "bg-bg-elevated text-text-faint", value === null && selectedRing)}
      >
        <Ban aria-hidden className="size-4" />
      </button>
      {COLOR_KEYS.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          aria-label={t(`todo.color.${color}`)}
          title={t(`todo.color.${color}`)}
          onClick={() => onChange(color)}
          className={cn(option, PALETTE_BG_CLASS[color], value === color && selectedRing)}
        />
      ))}
    </div>
  );
}

export function IconPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (icon: ListIconKey) => void;
}) {
  return (
    <div role="radiogroup" aria-label={t("todo.list.icon")} className="flex flex-wrap gap-1">
      {LIST_ICON_KEYS.map((key) => {
        const { icon: Icon, label } = LIST_ICONS[key];
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={value === key}
            aria-label={t(label)}
            title={t(label)}
            onClick={() => onChange(key)}
            className={cn(
              option,
              "text-text-muted hover:bg-surface-hover hover:text-text",
              value === key && "bg-accent-soft text-text",
            )}
          >
            <Icon aria-hidden className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
