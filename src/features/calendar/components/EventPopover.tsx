import { useEffect, useState } from "react";
import { CalendarDays, Copy, MapPin, Pencil, Repeat, Trash2 } from "lucide-react";
import type { Tag } from "@/shared/db";
import { t } from "@/shared/i18n";
import { Button, Chip, cn } from "@/shared/ui";
import { formatEventTime, formatLongDate, SWATCH_CLASSES, type TimeFormat } from "../format";
import { useEventActions } from "../hooks";
import type { EventOccurrence } from "../model";
import { listEventTags } from "../repository";
import { useCalendarStore } from "../store";

/** Content of the event popover: details and Edit / Duplicate / Delete. */
export function EventDetails({
  occurrence,
  timeFormat,
  onDone,
}: {
  occurrence: EventOccurrence;
  timeFormat: TimeFormat;
  onDone: () => void;
}) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const openEdit = useCalendarStore((state) => state.openEdit);
  const actions = useEventActions();

  useEffect(() => {
    let cancelled = false;
    listEventTags(occurrence.id).then(
      (result) => !cancelled && setTags(result),
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [occurrence.id]);

  const remove = async () => {
    if (occurrence.isRecurring && !confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    if (await actions.remove(occurrence.id)) onDone();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className={cn(
            "mt-1.5 size-[10px] shrink-0 rounded-full",
            occurrence.color ? SWATCH_CLASSES[occurrence.color] : "bg-accent",
            occurrence.isPastLog && "ring-1 ring-text-faint ring-offset-1 ring-offset-surface",
          )}
        />
        <p className="min-w-0 font-display text-lg font-semibold break-words">{occurrence.title}</p>
      </div>

      <ul className="flex flex-col gap-1.5 text-sm text-text-muted [&_svg]:size-4 [&_svg]:shrink-0">
        <li className="flex items-center gap-2">
          <CalendarDays aria-hidden />
          <span>
            {formatLongDate(occurrence.occurrenceDate)} · {formatEventTime(occurrence, timeFormat)}
          </span>
        </li>
        {occurrence.location ? (
          <li className="flex items-center gap-2">
            <MapPin aria-hidden />
            <span className="truncate">{occurrence.location}</span>
          </li>
        ) : null}
        {occurrence.isRecurring ? (
          <li className="flex items-center gap-2">
            <Repeat aria-hidden />
            <span>{t(`calendar.repeat.${occurrence.recurrence}`)}</span>
          </li>
        ) : null}
      </ul>

      {occurrence.isPastLog ? (
        <p className="text-xs text-text-muted italic">{t("calendar.pastLog")}</p>
      ) : null}

      {occurrence.description ? (
        <p className="text-sm whitespace-pre-wrap text-text">{occurrence.description}</p>
      ) : null}

      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <Chip key={tag.id} size="sm" color={tag.color ?? "neutral"}>
              {tag.name}
            </Chip>
          ))}
        </div>
      ) : null}

      {confirmDelete ? (
        <p role="alert" className="text-sm font-semibold text-danger">
          {t("calendar.dialog.deleteSeries")}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-1 border-t border-border pt-3">
        <Button
          size="sm"
          variant="soft"
          onClick={() => {
            onDone();
            openEdit(occurrence.id);
          }}
        >
          <Pencil aria-hidden />
          {t("calendar.event.edit")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            onDone();
            void actions.duplicate(occurrence.id);
          }}
        >
          <Copy aria-hidden />
          {t("calendar.event.duplicate")}
        </Button>
        <Button size="sm" variant="danger" onClick={remove}>
          <Trash2 aria-hidden />
          {confirmDelete ? t("calendar.dialog.deleteConfirm") : t("calendar.event.delete")}
        </Button>
      </div>
    </div>
  );
}
