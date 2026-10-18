import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Plus } from "lucide-react";
import { useFormattedBinding } from "@/shared/hotkeys";
import { t } from "@/shared/i18n";
import { log } from "@/shared/lib/log";
import type { DateISO } from "@/shared/lib/dates";
import { Kbd, cn } from "@/shared/ui";
import { useToday } from "../hooks";
import { INBOX_LIST_ID, type Task } from "../model";
import { parseQuickAdd } from "../quickAdd";
import { createTask } from "../repository";

export interface QuickAddProps {
  /** Target list; Inbox by default. */
  listId?: string;
  /** Due date used when the text has no `@hoy` / `@mañana`. */
  defaultDue?: DateISO | null;
  /** Each change of this number focuses the input (used by the `/` and Ctrl+N shortcuts). */
  focusSignal?: number;
  placeholder?: string;
  className?: string;
  onCreated?: (task: Task) => void;
}

/** "Añadir una tarea…": Enter creates the task, understanding `!alta` and `@mañana` suffixes. */
export function QuickAdd({
  listId = INBOX_LIST_ID,
  defaultDue = null,
  focusSignal,
  placeholder = t("todo.quickAdd.placeholder"),
  className,
  onCreated,
}: QuickAddProps) {
  const today = useToday();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const shortcut = useFormattedBinding("todo.quickAdd");

  const firstSignal = useRef(focusSignal);
  useEffect(() => {
    if (focusSignal !== firstSignal.current) inputRef.current?.focus();
  }, [focusSignal]);

  const submit = async () => {
    const parsed = parseQuickAdd(value, today);
    if (!parsed.title) return;
    setValue("");
    try {
      const task = await createTask({
        title: parsed.title,
        listId,
        priority: parsed.priority ?? "none",
        dueDate: parsed.dueDate ?? defaultDue,
      });
      onCreated?.(task);
    } catch (error) {
      setValue(value);
      log.error("todo: quick add failed", error);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <div className={className}>
      <label
        className={cn(
          "flex h-[48px] items-center gap-3 rounded-lg border border-border bg-surface px-4 shadow-(--shadow-sm)",
          "transition-[border-color,box-shadow] duration-(--dur-fast) ease-(--ease-soft)",
          "focus-within:border-accent focus-within:shadow-(--shadow-glow)",
        )}
      >
        <Plus aria-hidden className="size-5 shrink-0 text-accent" />
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          aria-label={t("todo.quickAdd.label")}
          className="min-w-0 flex-1 bg-transparent text-base text-text outline-none placeholder:text-text-faint"
        />
        {!focused && shortcut ? <Kbd combo={shortcut} size="sm" /> : null}
      </label>
      {focused ? (
        <p className="mt-1.5 px-4 text-xs text-text-faint">{t("todo.quickAdd.hint")}</p>
      ) : null}
    </div>
  );
}
