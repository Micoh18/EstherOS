import { useId, useState, type KeyboardEvent } from "react";
import type { Tag } from "@/shared/db";
import { t } from "@/shared/i18n";
import { Chip } from "@/shared/ui";

interface TagEditorProps {
  tags: Tag[];
  /** Existing tags offered as suggestions. */
  suggestions: Tag[];
  onAdd: (name: string) => void;
  onRemove: (tagId: string) => void;
}

/** Tags of the entry as removable chips, plus a tiny inline field to add one. */
export function TagEditor({ tags, suggestions, onAdd, onRemove }: TagEditorProps) {
  const [draft, setDraft] = useState("");
  const listId = useId();
  const used = new Set(tags.map((tag) => tag.id));

  const commit = () => {
    const name = draft.trim();
    if (name) onAdd(name);
    setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit();
    } else if (event.key === "Backspace" && !draft && tags.length > 0) {
      onRemove(tags[tags.length - 1].id);
    }
  };

  return (
    <div
      role="group"
      aria-label={t("journal.tags.label")}
      className="flex flex-wrap items-center gap-1.5"
    >
      {tags.map((tag) => (
        <Chip
          key={tag.id}
          size="sm"
          color={tag.color ?? "accent"}
          onRemove={() => onRemove(tag.id)}
          removeLabel={t("journal.tags.remove", { name: tag.name })}
        >
          {tag.name}
        </Chip>
      ))}
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        list={listId}
        maxLength={50}
        placeholder={t("journal.tags.placeholder")}
        aria-label={t("journal.tags.label")}
        className="h-[22px] w-[110px] rounded-full bg-transparent px-2 text-xs text-text outline-none placeholder:text-text-faint focus-visible:bg-surface-hover"
      />
      <datalist id={listId}>
        {suggestions
          .filter((tag) => !used.has(tag.id))
          .map((tag) => (
            <option key={tag.id} value={tag.name} />
          ))}
      </datalist>
    </div>
  );
}
