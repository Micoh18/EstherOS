import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Pencil, Trash2 } from "lucide-react";
import {
  COLOR_KEYS,
  deleteTag,
  findTagByName,
  listTags,
  onDbChanged,
  updateTag,
  type ColorKey,
  type DbTable,
  type Tag,
} from "@/shared/db";
import { log } from "@/shared/lib/log";
import {
  Button,
  Chip,
  IconButton,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from "@/shared/ui";
import { t } from "@/shared/i18n";
import { countTagUsage } from "../repository";

const USAGE_TABLES: DbTable[] = ["tag", "event", "journal_entry", "task"];

/** Static class names so Tailwind finds them. */
const SWATCH: Record<ColorKey, string> = {
  rose: "bg-palette-rose",
  lavender: "bg-palette-lavender",
  sage: "bg-palette-sage",
  butter: "bg-palette-butter",
  sky: "bg-palette-sky",
  peach: "bg-palette-peach",
};

interface TagRow extends Tag {
  uses: number;
}

function useTagRows() {
  const [rows, setRows] = useState<TagRow[]>([]);
  const load = useCallback(() => {
    Promise.all([listTags(), countTagUsage()]).then(
      ([tags, usage]) => setRows(tags.map((tag) => ({ ...tag, uses: usage.get(tag.id) ?? 0 }))),
      (error: unknown) => log.warn("Could not load tags", error),
    );
  }, []);
  useEffect(() => {
    load();
    const offs = USAGE_TABLES.map((table) => onDbChanged(table, load));
    return () => offs.forEach((off) => off());
  }, [load]);
  return rows;
}

function usesLabel(uses: number) {
  if (uses === 0) return t("settings.tags.uses.none");
  if (uses === 1) return t("settings.tags.uses.one");
  return t("settings.tags.uses.other", { count: uses });
}

function ColorPicker({ tag }: { tag: Tag }) {
  const [open, setOpen] = useState(false);
  const choose = (color: ColorKey | null) => {
    setOpen(false);
    updateTag(tag.id, { color }).catch((error: unknown) => log.warn("tag color", error));
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("settings.tags.color", { name: tag.name })}
          className="flex size-[32px] shrink-0 items-center justify-center rounded-full outline-none focus-visible:shadow-(--shadow-glow)"
        >
          <span
            aria-hidden
            className={cn(
              "size-[20px] rounded-full border border-border",
              tag.color ? SWATCH[tag.color] : "bg-bg-elevated",
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="flex w-auto gap-2 p-2">
        {COLOR_KEYS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={t(`settings.color.${color}`)}
            aria-pressed={tag.color === color}
            onClick={() => choose(color)}
            className={cn(
              "flex size-[32px] items-center justify-center rounded-full text-text outline-none focus-visible:shadow-(--shadow-glow)",
              SWATCH[color],
            )}
          >
            {tag.color === color ? <Check size={14} strokeWidth={3} aria-hidden /> : null}
          </button>
        ))}
        <button
          type="button"
          aria-label={t("settings.tags.noColor")}
          aria-pressed={tag.color === null}
          onClick={() => choose(null)}
          className="flex size-[32px] items-center justify-center rounded-full border border-border bg-bg-elevated text-text-muted outline-none focus-visible:shadow-(--shadow-glow)"
        >
          {tag.color === null ? <Check size={14} strokeWidth={3} aria-hidden /> : null}
        </button>
      </PopoverContent>
    </Popover>
  );
}

function NameEditor({ tag, onClose }: { tag: Tag; onClose: () => void }) {
  const [draft, setDraft] = useState(tag.name);
  const [error, setError] = useState<string | null>(null);
  // Enter saves and the blur that follows would save again: one save at a time.
  const saving = useRef(false);

  const save = async () => {
    if (saving.current) return;
    const name = draft.trim();
    if (name === "" || name === tag.name) return onClose();
    saving.current = true;
    try {
      const existing = await findTagByName(name);
      if (existing && existing.id !== tag.id) return setError(t("settings.tags.duplicate"));
      await updateTag(tag.id, { name });
      onClose();
    } catch (cause) {
      log.warn("tag rename", cause);
      setError(t("settings.tags.saveError"));
    } finally {
      saving.current = false;
    }
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <Input
        size="sm"
        autoFocus
        aria-label={t("settings.tags.rename", { name: tag.name })}
        aria-invalid={error ? true : undefined}
        value={draft}
        maxLength={50}
        onChange={(event) => {
          setDraft(event.target.value);
          setError(null);
        }}
        onBlur={() => void save()}
        onKeyDown={(event) => {
          if (event.key === "Enter") void save();
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
        }}
      />
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}

function TagItem({ tag }: { tag: TagRow }) {
  const [editing, setEditing] = useState(false);
  const renameRef = useRef<HTMLButtonElement>(null);
  const stopEditing = () => {
    setEditing(false);
    // The input goes away with the focus: give it back to the rename button.
    requestAnimationFrame(() => renameRef.current?.focus());
  };
  const [confirming, setConfirming] = useState(false);

  const confirmText =
    tag.uses === 0
      ? t("settings.tags.deleteConfirmUnused", { name: tag.name })
      : tag.uses === 1
        ? t("settings.tags.deleteConfirmOne", { name: tag.name })
        : t("settings.tags.deleteConfirm", { name: tag.name, count: tag.uses });

  return (
    <li className="flex flex-col gap-2 border-b border-border py-2 last:border-b-0">
      <div className="flex items-center gap-3">
        <ColorPicker tag={tag} />
        {editing ? (
          <NameEditor tag={tag} onClose={stopEditing} />
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Chip color={tag.color ?? "neutral"} size="sm">
              {tag.name}
            </Chip>
            <span className="text-xs text-text-muted">{usesLabel(tag.uses)}</span>
          </div>
        )}
        <IconButton
          ref={renameRef}
          size="sm"
          label={t("settings.tags.rename", { name: tag.name })}
          onClick={() => setEditing(true)}
        >
          <Pencil aria-hidden />
        </IconButton>
        <IconButton
          size="sm"
          label={t("settings.tags.delete", { name: tag.name })}
          onClick={() => setConfirming(true)}
        >
          <Trash2 aria-hidden />
        </IconButton>
      </div>
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-bg-elevated px-3 py-2 text-sm">
          <span className="flex-1">{confirmText}</span>
          <Button
            size="sm"
            variant="danger"
            onClick={() =>
              deleteTag(tag.id).catch((error: unknown) => log.warn("tag delete", error))
            }
          >
            {t("settings.tags.deleteYes")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            {t("settings.common.cancel")}
          </Button>
        </div>
      ) : null}
    </li>
  );
}

/** Shared tags: rename, palette color and delete (with how many items use each one). */
export function TagManager() {
  const rows = useTagRows();
  if (rows.length === 0) {
    return <p className="text-sm text-text-muted">{t("settings.tags.empty")}</p>;
  }
  return (
    <ul className="rounded-lg border border-border bg-surface px-4">
      {rows.map((tag) => (
        <TagItem key={tag.id} tag={tag} />
      ))}
    </ul>
  );
}
