import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Archive, ArchiveRestore, Ellipsis, Pencil, Trash } from "lucide-react";
import { useScope } from "@/shared/hotkeys";
import { t, type I18nKey } from "@/shared/i18n";
import { log } from "@/shared/lib/log";
import type { DateISO } from "@/shared/lib/dates";
import {
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  IconButton,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  cn,
} from "@/shared/ui";
import { INBOX_LIST_ID, type TodoList } from "../model";
import { archiveList, deleteList, updateList } from "../repository";
import { sortModeOf, useTodoStore } from "../store";
import { SORT_MODES, formatLongDate, type SmartView, type TodoSelection } from "../views";
import { ColorPicker, IconPicker } from "./ListStylePickers";
import { ListIcon } from "./ListIcon";
import { PALETTE_TEXT_CLASS } from "./listIcons";

const VIEW_TITLES: Record<SmartView, I18nKey> = {
  today: "todo.view.today",
  upcoming: "todo.view.upcoming",
  overdue: "todo.view.overdue",
  all: "todo.view.all",
};

/** Title of the active view or list, with the list menu and the sort selector. */
export function TodoHeader({
  selection,
  list,
  today,
}: {
  selection: TodoSelection;
  list: TodoList | null;
  today: DateISO;
}) {
  if (selection.kind === "view" || !list) {
    const view = selection.kind === "view" ? selection.view : "today";
    return (
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-semibold text-text">{t(VIEW_TITLES[view])}</h1>
        {view === "today" ? (
          <p className="text-sm text-text-muted">{formatLongDate(today)}</p>
        ) : null}
      </header>
    );
  }
  return <ListHeader key={list.id} list={list} />;
}

function ListHeader({ list }: { list: TodoList }) {
  const [editing, setEditing] = useState(false);
  const sortMode = useTodoStore((state) => sortModeOf(state, list.id));
  const titleRef = useRef<HTMLButtonElement>(null);
  // Set when the editor closes from the keyboard, so focus goes back to the title.
  const refocusTitle = useRef(false);

  useEffect(() => {
    if (editing || !refocusTitle.current) return;
    refocusTitle.current = false;
    titleRef.current?.focus();
  }, [editing]);

  return (
    <header className="flex items-center gap-3">
      <ListIcon
        icon={list.icon}
        aria-hidden
        className={cn(
          "size-6 shrink-0",
          list.color ? PALETTE_TEXT_CLASS[list.color] : "text-accent",
        )}
      />
      {editing ? (
        <ListNameEditor
          list={list}
          onDone={(refocus) => {
            refocusTitle.current = refocus;
            setEditing(false);
          }}
        />
      ) : (
        <h1 className="min-w-0 truncate font-display text-3xl font-semibold text-text">
          <button
            ref={titleRef}
            type="button"
            onClick={() => setEditing(true)}
            className="max-w-full truncate rounded-md text-left outline-none focus-visible:shadow-(--shadow-glow)"
          >
            {list.name}
          </button>
        </h1>
      )}
      {list.isArchived ? (
        <Chip size="sm" color="neutral">
          {t("todo.list.archivedBadge")}
        </Chip>
      ) : null}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Select
          size="sm"
          aria-label={t("todo.sort.label")}
          value={sortMode}
          onValueChange={(value) =>
            useTodoStore.getState().setSortMode(list.id, value as (typeof SORT_MODES)[number])
          }
          options={SORT_MODES.map((mode) => ({ value: mode, label: t(`todo.sort.${mode}`) }))}
          className="w-[140px]"
        />
        <ListMenu list={list} onRename={() => setEditing(true)} />
      </div>
    </header>
  );
}

function ListNameEditor({
  list,
  onDone,
}: {
  list: TodoList;
  /** `refocus` is true when the edit ended from the keyboard (Enter/Escape), not by blur. */
  onDone: (refocus: boolean) => void;
}) {
  const [name, setName] = useState(list.name);
  const [error, setError] = useState(false);

  const save = async (refocus: boolean) => {
    const next = name.trim();
    if (!next || next === list.name) return onDone(refocus);
    try {
      await updateList(list.id, { name: next });
      onDone(refocus);
    } catch (cause) {
      log.warn("todo: rename list failed", cause);
      setError(true);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void save(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onDone(true);
    }
  };

  return (
    <div className="flex min-w-0 flex-col">
      <Input
        autoFocus
        value={name}
        maxLength={60}
        aria-label={t("todo.list.name")}
        aria-invalid={error || undefined}
        onChange={(event) => {
          setName(event.target.value);
          setError(false);
        }}
        onBlur={() => void save(false)}
        onKeyDown={onKeyDown}
        className="h-[44px] font-display text-2xl font-semibold"
      />
      {error ? <span className="mt-1 text-sm text-danger">{t("todo.list.nameTaken")}</span> : null}
    </div>
  );
}

const menuItem = cn(
  "flex h-[34px] w-full items-center gap-2 rounded-sm px-3 text-left text-base outline-none",
  "hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:shadow-[inset_0_0_0_2px_var(--accent)]",
  "[&_svg]:size-4 [&_svg]:shrink-0",
);

function ListMenu({ list, onRename }: { list: TodoList; onRename: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isInbox = list.id === INBOX_LIST_ID;

  const run = (action: () => unknown) => () => {
    setOpen(false);
    void Promise.resolve(action()).catch((error: unknown) => log.error("todo: list menu", error));
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <IconButton label={t("todo.list.menu")} size="sm">
            <Ellipsis aria-hidden />
          </IconButton>
        </PopoverTrigger>
        <PopoverContent align="end" className="flex w-[264px] flex-col gap-3 p-2">
          <button type="button" className={menuItem} onClick={run(onRename)}>
            <Pencil aria-hidden />
            {t("todo.list.rename")}
          </button>
          <div className="flex flex-col gap-1.5 px-3">
            <span className="text-xs font-semibold text-text-muted">{t("todo.list.color")}</span>
            <ColorPicker
              value={list.color}
              onChange={(color) => void updateList(list.id, { color })}
            />
          </div>
          <div className="flex flex-col gap-1.5 px-2">
            <span className="px-1 text-xs font-semibold text-text-muted">
              {t("todo.list.icon")}
            </span>
            <IconPicker value={list.icon} onChange={(icon) => void updateList(list.id, { icon })} />
          </div>
          {!isInbox ? (
            <div className="flex flex-col border-t border-border pt-2">
              <button
                type="button"
                className={menuItem}
                onClick={run(() => archiveList(list.id, !list.isArchived))}
              >
                {list.isArchived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
                {t(list.isArchived ? "todo.list.unarchive" : "todo.list.archive")}
              </button>
              <button
                type="button"
                className={cn(menuItem, "text-danger")}
                onClick={run(() => setConfirmDelete(true))}
              >
                <Trash aria-hidden />
                {t("todo.list.delete")}
              </button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        {confirmDelete ? (
          <DeleteListConfirm list={list} onClose={() => setConfirmDelete(false)} />
        ) : null}
      </Dialog>
    </>
  );
}

function DeleteListConfirm({ list, onClose }: { list: TodoList; onClose: () => void }) {
  useScope("dialog");
  const confirm = async () => {
    await deleteList(list.id);
    useTodoStore.getState().selectList(INBOX_LIST_ID);
    onClose();
  };
  return (
    <DialogContent size="sm">
      <DialogHeader>
        <DialogTitle>{t("todo.list.deleteTitle", { name: list.name })}</DialogTitle>
        <DialogDescription>{t("todo.list.deleteBody")}</DialogDescription>
      </DialogHeader>
      <DialogFooter className="mt-5">
        <Button variant="ghost" onClick={onClose}>
          {t("todo.action.cancel")}
        </Button>
        <Button
          variant="danger"
          onClick={() =>
            void confirm().catch((error: unknown) => log.error("todo: delete list", error))
          }
        >
          {t("todo.list.delete")}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
