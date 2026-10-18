import {
  useEffect,
  useId,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Trash2 } from "lucide-react";
import { ensureTag, listTags, type Tag } from "@/shared/db";
import { useScope } from "@/shared/hotkeys";
import { t } from "@/shared/i18n";
import { parseDateISO, todayISO, toDateISO, type DateISO } from "@/shared/lib/dates";
import { log } from "@/shared/lib/log";
import { PALETTE_COLORS, type PaletteColor } from "@/shared/theme";
import {
  Button,
  Checkbox,
  Chip,
  cn,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  Switch,
  Textarea,
  TimePicker,
  useToast,
} from "@/shared/ui";
import { SWATCH_CLASSES, type TimeFormat } from "../format";
import { useEventActions } from "../hooks";
import { RECURRENCES, type NewEvent, type Recurrence } from "../model";
import { createEvent, getEvent, listEventTags, setEventTags, updateEvent } from "../repository";
import { useCalendarStore, type EventDraft } from "../store";

interface FormState {
  title: string;
  allDay: boolean;
  date: DateISO;
  startTime: string;
  endTime: string;
  color: PaletteColor;
  recurrence: Recurrence;
  until: DateISO | null;
  tags: string[];
  location: string;
  description: string;
  pastLog: boolean;
}

const DEFAULT_COLOR: PaletteColor = "rose";

function formFromDraft(draft: EventDraft): FormState {
  return {
    title: "",
    allDay: draft.allDay,
    date: draft.date,
    startTime: draft.startTime ?? "09:00",
    endTime: draft.endTime ?? "10:00",
    color: DEFAULT_COLOR,
    recurrence: "none",
    until: null,
    tags: [],
    location: "",
    description: "",
    // Past dates are a log of what happened unless the user unchecks it.
    pastLog: true,
  };
}

async function loadForm(eventId: string): Promise<FormState | null> {
  const [event, tags] = await Promise.all([getEvent(eventId), listEventTags(eventId)]);
  if (!event) return null;
  return {
    title: event.title,
    allDay: event.allDay,
    date: event.date,
    startTime: event.startAt?.slice(11, 16) ?? "09:00",
    endTime: event.endAt?.slice(11, 16) ?? "10:00",
    color: event.color ?? DEFAULT_COLOR,
    recurrence: event.recurrence,
    until: event.recurrenceUntil,
    tags: tags.map((tag) => tag.name),
    location: event.location ?? "",
    description: event.description ?? "",
    pastLog: event.isPastLog,
  };
}

function toInput(form: FormState, today: DateISO): NewEvent {
  return {
    title: form.title.trim(),
    allDay: form.allDay,
    date: form.date,
    startAt: form.allDay ? null : `${form.date}T${form.startTime}:00`,
    endAt: form.allDay ? null : `${form.date}T${form.endTime}:00`,
    color: form.color,
    recurrence: form.recurrence,
    recurrenceUntil: form.recurrence === "none" ? null : form.until,
    location: form.location,
    description: form.description,
    isPastLog: form.date < today ? form.pastLog : false,
  };
}

interface EventDialogProps {
  weekStartsOn: number;
  timeFormat: TimeFormat;
}

/** Create / edit dialog, driven by `useCalendarStore().dialog`. */
export function EventDialog({ weekStartsOn, timeFormat }: EventDialogProps) {
  const dialog = useCalendarStore((state) => state.dialog);
  const closeDialog = useCalendarStore((state) => state.closeDialog);
  // Remount the form for every opening so it starts from fresh values.
  const sessionKey = dialog
    ? dialog.mode === "edit"
      ? `edit:${dialog.eventId}`
      : `create:${JSON.stringify(dialog.draft)}`
    : "closed";

  return (
    <Dialog open={dialog !== null} onOpenChange={(open) => !open && closeDialog()}>
      {dialog ? (
        <DialogContent size="lg">
          <EventForm
            key={sessionKey}
            eventId={dialog.mode === "edit" ? dialog.eventId : null}
            draft={dialog.mode === "create" ? dialog.draft : null}
            weekStartsOn={weekStartsOn === 0 ? 0 : 1}
            timeFormat={timeFormat}
            onClose={closeDialog}
          />
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

interface EventFormProps {
  eventId: string | null;
  draft: EventDraft | null;
  weekStartsOn: 0 | 1;
  timeFormat: TimeFormat;
  onClose: () => void;
}

function EventForm({ eventId, draft, weekStartsOn, timeFormat, onClose }: EventFormProps) {
  useScope("dialog");
  const ids = useId();
  const { toast } = useToast();
  const actions = useEventActions();
  const [form, setForm] = useState<FormState | null>(() => (draft ? formFromDraft(draft) : null));
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [knownTags, setKnownTags] = useState<Tag[]>([]);
  const today = todayISO();

  useEffect(() => {
    let cancelled = false;
    listTags().then(
      (tags) => !cancelled && setKnownTags(tags),
      () => undefined,
    );
    if (eventId) {
      loadForm(eventId).then(
        (loaded) => {
          if (cancelled) return;
          if (loaded) setForm(loaded);
          else onClose();
        },
        (error: unknown) => {
          log.error("load event failed", error);
          if (!cancelled) onClose();
        },
      );
    }
    return () => {
      cancelled = true;
    };
  }, [eventId, onClose]);

  if (!form) {
    return (
      <DialogHeader>
        <DialogTitle>{t("calendar.dialog.editTitle")}</DialogTitle>
      </DialogHeader>
    );
  }

  const update = (patch: Partial<FormState>) => setForm({ ...form, ...patch });
  const isPast = form.date < today;
  const endBeforeStart = !form.allDay && form.endTime < form.startTime;
  const isRecurring = form.recurrence !== "none";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || saving) return;
    setSaving(true);
    try {
      const input = toInput(form, today);
      const saved = eventId ? await updateEvent(eventId, input) : await createEvent(input);
      const tags = await Promise.all(form.tags.map((name) => ensureTag(name)));
      await setEventTags(
        saved.id,
        tags.map((tag) => tag.id),
      );
      onClose();
    } catch (error) {
      // The dialog stays open with the user's data.
      log.error("save event failed", error);
      toast({ title: t("calendar.toast.saveError"), variant: "danger" });
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!eventId) return;
    if (isRecurring && !confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    if (await actions.remove(eventId)) onClose();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <DialogHeader className="mb-0">
        <DialogTitle>
          {eventId ? t("calendar.dialog.editTitle") : t("calendar.dialog.newTitle")}
        </DialogTitle>
        <DialogDescription>{t("calendar.dialog.description")}</DialogDescription>
      </DialogHeader>

      <Field label={t("calendar.field.title")} htmlFor={`${ids}-title`}>
        <Input
          id={`${ids}-title`}
          autoFocus
          required
          maxLength={200}
          value={form.title}
          placeholder={t("calendar.field.titlePlaceholder")}
          onChange={(event) => update({ title: event.target.value })}
        />
      </Field>

      <div className="flex flex-wrap items-end gap-4">
        <Field label={t("calendar.field.date")} htmlFor={`${ids}-date`} className="w-[200px]">
          <DatePicker
            id={`${ids}-date`}
            value={parseDateISO(form.date)}
            clearable={false}
            weekStartsOn={weekStartsOn}
            onChange={(date) => date && update({ date: toDateISO(date) })}
          />
        </Field>
        {!form.allDay ? (
          <>
            <Field label={t("calendar.field.start")} htmlFor={`${ids}-start`} className="w-[140px]">
              <TimePicker
                id={`${ids}-start`}
                value={form.startTime}
                hourCycle={timeFormat === "12h" ? 12 : 24}
                onChange={(startTime) => update({ startTime })}
              />
            </Field>
            <Field label={t("calendar.field.end")} htmlFor={`${ids}-end`} className="w-[140px]">
              <TimePicker
                id={`${ids}-end`}
                value={form.endTime}
                hourCycle={timeFormat === "12h" ? 12 : 24}
                onChange={(endTime) => update({ endTime })}
              />
            </Field>
          </>
        ) : null}
        <label className="flex h-[40px] items-center gap-2 text-sm font-semibold">
          <Switch checked={form.allDay} onCheckedChange={(allDay) => update({ allDay })} />
          {t("calendar.field.allDay")}
        </label>
      </div>
      {endBeforeStart ? (
        <p className="-mt-2 text-xs text-text-muted">{t("calendar.dialog.endAdjusted")}</p>
      ) : null}

      {isPast ? (
        <label className="flex items-center gap-3 rounded-md bg-bg-elevated px-3 py-2 text-sm">
          <Checkbox
            size="sm"
            checked={form.pastLog}
            onCheckedChange={(pastLog) => update({ pastLog })}
          />
          {t("calendar.field.pastLog")}
        </label>
      ) : null}

      <Field label={t("calendar.field.color")}>
        <div role="radiogroup" aria-label={t("calendar.field.color")} className="flex gap-2">
          {PALETTE_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={form.color === color}
              aria-label={t(`calendar.color.${color}`)}
              title={t(`calendar.color.${color}`)}
              onClick={() => update({ color })}
              className={cn(
                "size-[28px] rounded-full border-2 border-surface outline-none",
                "transition-transform duration-(--dur-fast) ease-(--ease-spring) hover:scale-110",
                "focus-visible:shadow-(--shadow-glow)",
                SWATCH_CLASSES[color],
                form.color === color && "shadow-[0_0_0_2px_var(--text)]",
              )}
            />
          ))}
        </div>
      </Field>

      <div className="flex flex-wrap items-end gap-4">
        <Field label={t("calendar.field.repeat")} htmlFor={`${ids}-repeat`} className="w-[200px]">
          <Select
            id={`${ids}-repeat`}
            value={form.recurrence}
            onValueChange={(value) => update({ recurrence: value as Recurrence })}
            options={RECURRENCES.map((value) => ({
              value,
              label: t(`calendar.repeat.${value}`),
            }))}
          />
        </Field>
        {isRecurring ? (
          <Field label={t("calendar.field.until")} htmlFor={`${ids}-until`} className="w-[200px]">
            <DatePicker
              id={`${ids}-until`}
              value={form.until ? parseDateISO(form.until) : null}
              placeholder={t("calendar.field.untilPlaceholder")}
              minDate={parseDateISO(form.date)}
              weekStartsOn={weekStartsOn}
              onChange={(date) => update({ until: date ? toDateISO(date) : null })}
            />
          </Field>
        ) : null}
      </div>

      <Field label={t("calendar.field.tags")} htmlFor={`${ids}-tags`}>
        <TagField
          id={`${ids}-tags`}
          tags={form.tags}
          known={knownTags}
          onChange={(tags) => update({ tags })}
        />
      </Field>

      <Field label={t("calendar.field.location")} htmlFor={`${ids}-location`}>
        <Input
          id={`${ids}-location`}
          maxLength={500}
          value={form.location}
          placeholder={t("calendar.field.locationPlaceholder")}
          onChange={(event) => update({ location: event.target.value })}
        />
      </Field>

      <Field label={t("calendar.field.notes")} htmlFor={`${ids}-notes`}>
        <Textarea
          id={`${ids}-notes`}
          rows={3}
          value={form.description}
          placeholder={t("calendar.field.notesPlaceholder")}
          onChange={(event) => update({ description: event.target.value })}
        />
      </Field>

      {confirmDelete ? (
        <p role="alert" className="text-sm font-semibold text-danger">
          {t("calendar.dialog.deleteSeries")}
        </p>
      ) : null}

      <DialogFooter className="mt-2 items-center">
        {eventId ? (
          <Button variant="danger" className="mr-auto" onClick={remove}>
            <Trash2 aria-hidden />
            {confirmDelete ? t("calendar.dialog.deleteConfirm") : t("calendar.dialog.delete")}
          </Button>
        ) : null}
        <Button variant="ghost" onClick={onClose}>
          {t("calendar.dialog.cancel")}
        </Button>
        <Button type="submit" disabled={!form.title.trim() || saving}>
          {t("calendar.dialog.save")}
        </Button>
      </DialogFooter>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

function TagField({
  id,
  tags,
  known,
  onChange,
}: {
  id: string;
  tags: string[];
  known: Tag[];
  onChange: (tags: string[]) => void;
}) {
  const [text, setText] = useState("");
  const listId = `${id}-suggestions`;

  const add = () => {
    const name = text.trim().slice(0, 50);
    setText("");
    if (!name || tags.some((tag) => tag.toLowerCase() === name.toLowerCase())) return;
    onChange([...tags, name]);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add();
    } else if (event.key === "Backspace" && !text && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };

  const colorOf = (name: string) =>
    known.find((tag) => tag.name.toLowerCase() === name.toLowerCase())?.color ?? "neutral";

  return (
    <div className="flex flex-col gap-2">
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((name) => (
            <Chip
              key={name}
              size="sm"
              color={colorOf(name)}
              removeLabel={t("calendar.dialog.removeTag", { name })}
              onRemove={() => onChange(tags.filter((tag) => tag !== name))}
            >
              {name}
            </Chip>
          ))}
        </div>
      ) : null}
      <Input
        id={id}
        list={listId}
        value={text}
        placeholder={t("calendar.field.tagsPlaceholder")}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
      />
      <datalist id={listId}>
        {known
          .filter((tag) => !tags.includes(tag.name))
          .map((tag) => (
            <option key={tag.id} value={tag.name} />
          ))}
      </datalist>
    </div>
  );
}
