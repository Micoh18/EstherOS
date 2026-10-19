import { MOODS, type Mood } from "../model";
import { t } from "@/shared/i18n";
import { formatBinding, type ActionId } from "@/shared/hotkeys";
import { Tooltip, cn } from "@/shared/ui";
import { MOOD_BG, MOOD_ICONS, MOOD_TEXT, moodLabelKey } from "./mood";

interface MoodPickerProps {
  value: Mood | null;
  /** `null` when the selected mood is clicked again. */
  onChange: (mood: Mood | null) => void;
}

/**
 * Five round faces, from "Radiante" to "Mal". Toggle buttons rather than radios: pressing the
 * selected face again clears the mood, which a radio group cannot do.
 */
export function MoodPicker({ value, onChange }: MoodPickerProps) {
  return (
    <div role="group" aria-label={t("journal.mood.label")} className="flex items-center gap-1">
      {MOODS.map((mood, index) => {
        const Icon = MOOD_ICONS[mood];
        const selected = value === mood;
        const label = t(moodLabelKey(mood));
        return (
          <Tooltip
            key={mood}
            content={selected ? t("journal.mood.clearHint", { mood: label }) : label}
            shortcut={formatBinding(`journal.mood${index + 1}` as ActionId) || undefined}
          >
            <button
              type="button"
              aria-pressed={selected}
              aria-label={label}
              onClick={() => onChange(selected ? null : mood)}
              className={cn(
                "inline-flex size-[32px] items-center justify-center rounded-full outline-none",
                "transition-[background-color,color,scale] duration-(--dur-fast) ease-(--ease-soft)",
                "focus-visible:shadow-(--shadow-glow) active:scale-[0.94] motion-reduce:active:scale-100",
                "[&_svg]:size-[20px]",
                selected
                  ? cn(MOOD_BG[mood], "text-text shadow-(--shadow-sm)")
                  : cn(MOOD_TEXT[mood], "hover:bg-surface-hover"),
              )}
            >
              <Icon aria-hidden />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
