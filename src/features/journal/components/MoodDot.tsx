import { cn } from "@/shared/ui";
import { t } from "@/shared/i18n";
import type { Mood } from "../model";
import { MOOD_BG, moodLabelKey } from "./mood";

/** Small dot: the mood color, or the accent when the day has entries but no mood. */
export function MoodDot({ mood, className }: { mood: Mood | null; className?: string }) {
  return (
    <span
      role={mood ? "img" : undefined}
      aria-label={mood ? t(moodLabelKey(mood)) : undefined}
      aria-hidden={mood ? undefined : true}
      className={cn(
        "inline-block size-[6px] shrink-0 rounded-full",
        mood ? MOOD_BG[mood] : "bg-accent",
        className,
      )}
    />
  );
}
