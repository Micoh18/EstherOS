import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { Editor } from "@tiptap/react";
import { ensureTag, type Tag } from "@/shared/db";
import { formatBinding, useHotkey } from "@/shared/hotkeys";
import { t } from "@/shared/i18n";
import { Heart } from "@/shared/icons";
import { parseDateISO, type DateISO } from "@/shared/lib/dates";
import { log } from "@/shared/lib/log";
import { IconButton, Tooltip, useToast } from "@/shared/ui";
import type { SaveStatus } from "../autosave";
import { useAllTags } from "../hooks";
import { EMPTY_DOC_JSON, MOODS, countWords, type JournalEntry, type Mood } from "../model";
import { createEntryController } from "../session";
import { markPersisted, sessionIndex, showDraft, showEntry } from "../store";
import { DeleteButton } from "./DeleteButton";
import { EntryMenu } from "./EntryMenu";
import { JournalEditor } from "./JournalEditor";
import { MoodPicker } from "./MoodPicker";
import { SaveIndicator } from "./SaveIndicator";
import { TagEditor } from "./TagEditor";

const PLACEHOLDERS = [
  "journal.placeholder.0",
  "journal.placeholder.1",
  "journal.placeholder.2",
  "journal.placeholder.3",
  "journal.placeholder.4",
] as const;

export interface EntrySessionProps {
  /** Session number (see `ActiveEntry.seq`). */
  seq: number;
  date: DateISO;
  /** Saved entry being edited, or `null` for a new in-memory draft. */
  initial: JournalEntry | null;
  initialTags: Tag[];
  /** The entry was deleted: open something else. */
  onDeleted: () => void;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function formatHeaderDate(date: DateISO): string {
  const day = parseDateISO(date);
  const pattern =
    day.getFullYear() === new Date().getFullYear()
      ? "EEEE, d 'de' MMMM"
      : "EEEE, d 'de' MMMM 'de' yyyy";
  return capitalize(format(day, pattern, { locale: es }));
}

/**
 * One editing session of one entry. Autosave is debounced while typing, immediate for mood,
 * favorite and tags, flushed when the window loses focus or closes, and when the session ends
 * (switching entries), after which an empty entry is deleted.
 */
export function EntrySession({ seq, date, initial, initialTags, onDeleted }: EntrySessionProps) {
  const toast = useToast();
  const { data: allTags } = useAllTags();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [mood, setMood] = useState<Mood | null>(initial?.mood ?? null);
  const [isFavorite, setIsFavorite] = useState(initial?.isFavorite ?? false);
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [words, setWords] = useState(() => countWords(initial?.contentText ?? ""));
  const [entryId, setEntryId] = useState<string | null>(initial?.id ?? null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [savedCount, setSavedCount] = useState(0);
  const titleRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);

  const [entry] = useState(() =>
    createEntryController({
      date,
      initial,
      initialTagIds: initialTags.map((tag) => tag.id),
      onStatus: (next) => {
        setStatus(next);
        if (next === "saved") setSavedCount((count) => count + 1);
      },
      onPersisted: (id) => {
        setEntryId(id);
        markPersisted(seq, id);
      },
    }),
  );

  // Leaving the entry: save what is pending, then drop it if it ended up empty.
  useEffect(
    () => () => {
      entry.leave().catch((error: unknown) => log.error("could not close journal entry", error));
    },
    [entry],
  );

  // Window blur, hiding and closing also save right away.
  useEffect(() => {
    const flush = () => void entry.flush();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("blur", flush);
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", flush);
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [entry]);

  // Persistent error toast while saving fails; the autosaver keeps retrying every 5 s.
  const errorToast = useRef<string | null>(null);
  useEffect(() => {
    if (status === "error" && !errorToast.current) {
      errorToast.current = toast.toast({
        title: t("journal.entry.saveError"),
        description: t("journal.entry.saveErrorRetry"),
        variant: "danger",
        duration: Infinity,
      });
    } else if (status === "saved" && errorToast.current) {
      toast.dismiss(errorToast.current);
      errorToast.current = null;
    }
  }, [status, toast]);

  useEffect(
    () => () => {
      if (errorToast.current) toast.dismiss(errorToast.current);
    },
    [toast],
  );

  // Handlers -------------------------------------------------------------------------------

  const onContentChange = useCallback(
    (contentJson: string, contentText: string) => {
      setWords(countWords(contentText));
      entry.change({ contentJson, contentText });
    },
    [entry],
  );

  const chooseMood = (next: Mood | null) => {
    setMood(next);
    entry.change({ mood: next }, true);
  };

  const toggleFavorite = () => {
    const next = !entry.fields.isFavorite;
    setIsFavorite(next);
    entry.change({ isFavorite: next }, true);
  };

  const addTag = async (name: string) => {
    try {
      const tag = await ensureTag(name);
      if (entry.fields.tagIds.includes(tag.id)) return;
      setTags((current) => [...current, tag]);
      entry.change({ tagIds: [...entry.fields.tagIds, tag.id] }, true);
    } catch (error) {
      log.error("could not add tag", error);
    }
  };

  const removeTag = (tagId: string) => {
    setTags((current) => current.filter((tag) => tag.id !== tagId));
    entry.change({ tagIds: entry.fields.tagIds.filter((id) => id !== tagId) }, true);
  };

  const remove = async () => {
    try {
      await entry.remove();
    } catch (error) {
      log.error("could not delete journal entry", error);
    }
    onDeleted();
  };

  const duplicate = async () => {
    try {
      const copy = await entry.duplicate();
      if (copy) showEntry(copy);
    } catch (error) {
      log.error("could not duplicate journal entry", error);
    }
  };

  const onTitleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === "ArrowDown") {
      event.preventDefault();
      editorRef.current?.commands.focus("start");
    }
  };

  const onEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor;
  }, []);
  const onEditorEscape = useCallback(() => titleRef.current?.focus(), []);

  // Shortcuts of the journal scope that act on the open entry.
  useHotkey("journal.toggleFavorite", toggleFavorite);
  useHotkey("journal.mood1", () => chooseMood(MOODS[0]));
  useHotkey("journal.mood2", () => chooseMood(MOODS[1]));
  useHotkey("journal.mood3", () => chooseMood(MOODS[2]));
  useHotkey("journal.mood4", () => chooseMood(MOODS[3]));
  useHotkey("journal.mood5", () => chooseMood(MOODS[4]));

  const favoriteLabel = isFavorite ? t("journal.favorite.remove") : t("journal.favorite.add");
  const createdTime = initial ? format(parseISO(initial.createdAt), "HH:mm") : null;

  return (
    <article className="mx-auto flex w-full max-w-[calc(68ch+80px)] flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h1 className="font-display text-3xl leading-tight font-semibold text-text">
            {formatHeaderDate(date)}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {createdTime
              ? t("journal.entry.createdAt", { time: createdTime })
              : t("journal.entry.draft")}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <MoodPicker value={mood} onChange={chooseMood} />
          <span aria-hidden className="mx-1 h-[20px] w-px bg-border" />
          <Tooltip
            content={favoriteLabel}
            shortcut={formatBinding("journal.toggleFavorite") || undefined}
          >
            <IconButton
              label={favoriteLabel}
              size="sm"
              aria-pressed={isFavorite}
              onClick={toggleFavorite}
              className={isFavorite ? "text-accent hover:text-accent" : undefined}
            >
              <Heart size={18} filled={isFavorite} />
            </IconButton>
          </Tooltip>
          <EntryMenu
            onNewEntry={() => showDraft(date)}
            onDuplicate={() => void duplicate()}
            canDuplicate={entryId !== null}
          />
          <DeleteButton onConfirm={() => void remove()} />
        </div>
      </header>

      <TagEditor
        tags={tags}
        suggestions={allTags}
        onAdd={(name) => void addTag(name)}
        onRemove={removeTag}
      />

      <div className="rounded-xl border border-border bg-surface p-[40px] shadow-(--shadow-sm)">
        <input
          ref={titleRef}
          value={title}
          maxLength={200}
          onChange={(event) => {
            setTitle(event.target.value);
            entry.change({ title: event.target.value });
          }}
          onKeyDown={onTitleKeyDown}
          placeholder={t("journal.entry.titlePlaceholder")}
          aria-label={t("journal.entry.titleLabel")}
          className="mb-4 w-full bg-transparent font-display text-2xl font-semibold text-text outline-none placeholder:text-text-faint"
        />
        <JournalEditor
          initialContent={initial?.contentJson ?? EMPTY_DOC_JSON}
          placeholder={t(PLACEHOLDERS[sessionIndex(seq, PLACEHOLDERS.length)])}
          autoFocus
          onChange={onContentChange}
          onEscape={onEditorEscape}
          onReady={onEditorReady}
        />
      </div>

      <footer className="flex items-center justify-between px-2">
        <SaveIndicator status={status} savedCount={savedCount} />
        <span className="text-xs text-text-faint" aria-live="off">
          {words === 1 ? t("journal.entry.wordsOne") : t("journal.entry.words", { count: words })}
        </span>
      </footer>
    </article>
  );
}
