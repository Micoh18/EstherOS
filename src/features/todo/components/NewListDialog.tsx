import { useState, type FormEvent } from "react";
import type { ColorKey } from "@/shared/db";
import { useScope } from "@/shared/hotkeys";
import { t } from "@/shared/i18n";
import { log } from "@/shared/lib/log";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@/shared/ui";
import { createList } from "../repository";
import { useTodoStore } from "../store";
import { ColorPicker, IconPicker } from "./ListStylePickers";

/** "Nueva lista": name, color and icon. Selects the list once created. */
export function NewListDialog() {
  const open = useTodoStore((state) => state.newListOpen);
  const setOpen = useTodoStore((state) => state.setNewListOpen);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {open ? <NewListForm onDone={() => setOpen(false)} /> : null}
    </Dialog>
  );
}

function NewListForm({ onDone }: { onDone: () => void }) {
  useScope("dialog");
  const [name, setName] = useState("");
  const [color, setColor] = useState<ColorKey | null>("rose");
  const [icon, setIcon] = useState<string>("heart");
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      const list = await createList({ name, color, icon });
      useTodoStore.getState().selectList(list.id);
      onDone();
    } catch (cause) {
      log.warn("todo: create list failed", cause);
      setError(t("todo.list.nameTaken"));
    }
  };

  return (
    <DialogContent size="sm">
      <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-5">
        <DialogHeader>
          <DialogTitle>{t("todo.list.newTitle")}</DialogTitle>
          <DialogDescription>{t("todo.list.newDescription")}</DialogDescription>
        </DialogHeader>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-text-muted">{t("todo.list.name")}</span>
          <Input
            autoFocus
            value={name}
            maxLength={60}
            placeholder={t("todo.list.namePlaceholder")}
            aria-invalid={error ? true : undefined}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
          />
          {error ? <span className="text-sm text-danger">{error}</span> : null}
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-text-muted">{t("todo.list.color")}</span>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-text-muted">{t("todo.list.icon")}</span>
          <IconPicker value={icon} onChange={setIcon} />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onDone}>
            {t("todo.action.cancel")}
          </Button>
          <Button type="submit" disabled={!name.trim()}>
            {t("todo.list.create")}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
