import { t } from "@/shared/i18n";
import type { SaveStatus } from "../autosave";

/** Subtle save state: "Guardando…" while writing to disk, "Guardado ✓" that fades away. */
export function SaveIndicator({ status, savedCount }: { status: SaveStatus; savedCount: number }) {
  return (
    <span role="status" className="text-xs text-text-faint">
      {status === "saving" ? (
        <span>{t("journal.entry.saving")}</span>
      ) : status === "saved" ? (
        <span key={savedCount} className="journal-saved">
          {t("journal.entry.saved")}
        </span>
      ) : null}
    </span>
  );
}
