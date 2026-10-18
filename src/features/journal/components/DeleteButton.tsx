import { useEffect, useState } from "react";
import { t } from "@/shared/i18n";
import { Button, IconButton, Tooltip } from "@/shared/ui";
import { Trash } from "./icons";

export const DELETE_CONFIRM_MS = 4000;

/** Inline confirmation: the button turns into "¿Eliminar? Sí / No" for 4 s. No modal. */
export function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), DELETE_CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [confirming]);

  if (!confirming) {
    return (
      <Tooltip content={t("journal.delete.label")}>
        <IconButton label={t("journal.delete.label")} size="sm" onClick={() => setConfirming(true)}>
          <Trash aria-hidden />
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <div role="group" aria-label={t("journal.delete.label")} className="flex items-center gap-1">
      <span className="pl-1 text-sm font-semibold text-danger" aria-live="polite">
        {t("journal.delete.confirm")}
      </span>
      <Button variant="danger" size="sm" onClick={onConfirm} autoFocus>
        {t("journal.delete.yes")}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        {t("journal.delete.no")}
      </Button>
    </div>
  );
}
