import { t } from "@/shared/i18n";
import { Heart } from "@/shared/icons";
import { cn } from "@/shared/ui";
import type { JournalEntry } from "../model";
import { MOOD_BG, moodLabelKey } from "./mood";

export interface JournalPreviewProps {
  entry: JournalEntry;
  /** Makes the preview a button (e.g. open the entry in the journal). */
  onOpen?: () => void;
  className?: string;
}

/** Compact preview for other screens: title, first three lines and the mood. */
export function JournalPreview({ entry, onOpen, className }: JournalPreviewProps) {
  const text = entry.contentText.replace(/\s+/g, " ").trim();
  const body = (
    <>
      <span className="flex items-center gap-2">
        {entry.mood ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-elevated px-2 py-0.5 text-xs font-semibold text-text-muted">
            <span aria-hidden className={cn("size-[8px] rounded-full", MOOD_BG[entry.mood])} />
            {t(moodLabelKey(entry.mood))}
          </span>
        ) : null}
        {entry.isFavorite ? (
          <Heart size={14} filled className="text-accent" title={t("journal.list.favorite")} />
        ) : null}
      </span>
      {entry.title ? (
        <span className="truncate font-display text-md font-semibold text-text">{entry.title}</span>
      ) : null}
      <span className={cn("line-clamp-3 text-sm", text ? "text-text-muted" : "text-text-faint")}>
        {text || t("journal.preview.empty")}
      </span>
    </>
  );
  const classes = cn("flex min-w-0 flex-col gap-1 text-left", className);
  if (!onOpen) return <div className={classes}>{body}</div>;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(classes, "rounded-md outline-none focus-visible:shadow-(--shadow-glow)")}
    >
      {body}
    </button>
  );
}
