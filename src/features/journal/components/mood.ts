import type { I18nKey } from "@/shared/i18n";
import type { Mood } from "../model";
import {
  FaceExpressionless,
  FaceGrinning,
  FaceNeutral,
  FaceSlightlyFrowning,
  FaceSlightlySmiling,
} from "@/shared/icons";

export const MOOD_ICONS = {
  great: FaceGrinning,
  good: FaceSlightlySmiling,
  okay: FaceNeutral,
  low: FaceExpressionless,
  bad: FaceSlightlyFrowning,
} satisfies Record<Mood, unknown>;

/** Static class names so Tailwind sees them. */
export const MOOD_BG: Record<Mood, string> = {
  great: "bg-mood-great",
  good: "bg-mood-good",
  okay: "bg-mood-okay",
  low: "bg-mood-low",
  bad: "bg-mood-bad",
};

export const MOOD_TEXT: Record<Mood, string> = {
  great: "text-mood-great",
  good: "text-mood-good",
  okay: "text-mood-okay",
  low: "text-mood-low",
  bad: "text-mood-bad",
};

export const moodLabelKey = (mood: Mood) => `journal.mood.${mood}` as I18nKey;
