import { BookHeart, PenLine } from "lucide-react";
import { Heart } from "@/shared/icons";
import { t } from "@/shared/i18n";
import type { DateISO } from "@/shared/lib/dates";
import { Button, EmptyState } from "@/shared/ui";
import { JournalPreview, useJournalEntriesForDate, useJournalStreak } from "@/features/journal";
import { useOpenJournal } from "../hooks";
import { CardError, CardLoading, TodayCard } from "./TodayCard";

function streakText(days: number): string {
  if (days === 0) return t("today.journal.streakNone");
  if (days === 1) return t("today.journal.streakOne");
  return t("today.journal.streak", { count: days });
}

/** "Tu diario": preview of today's entry and the writing streak, or an invitation to write. */
export function JournalCard({ today }: { today: DateISO }) {
  const openJournal = useOpenJournal(today);
  const { data: entries, loading, error } = useJournalEntriesForDate(today);
  const streak = useJournalStreak();
  const latest = entries.at(-1);

  return (
    <TodayCard
      title={t("today.journal.title")}
      icon={<BookHeart />}
      footer={
        <>
          <span className="flex flex-1 items-center gap-1.5 text-xs text-text-muted">
            <Heart size={12} filled={streak.days > 0} className="text-accent" />
            {streakText(streak.days)}
          </span>
          {latest ? (
            <Button size="sm" variant="ghost" onClick={openJournal}>
              {t("today.journal.open")}
            </Button>
          ) : null}
        </>
      }
    >
      {error ? (
        <CardError message={t("today.journal.error")} />
      ) : loading ? (
        <CardLoading rows={1} />
      ) : latest ? (
        <JournalPreview
          entry={latest}
          onOpen={openJournal}
          className="w-full rounded-md p-2 hover:bg-surface-hover"
        />
      ) : (
        <EmptyState
          size="sm"
          icon={<PenLine className="size-[22px]" />}
          title={t("today.journal.prompt")}
          description={t("today.journal.promptHint")}
          action={
            <Button size="sm" onClick={openJournal}>
              {t("today.journal.write")}
            </Button>
          }
        />
      )}
    </TodayCard>
  );
}
