import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { Button, Kbd, cn } from "@/shared/ui";
import { t } from "@/shared/i18n";
import { getAction, type ActionId } from "./actions";
import { eventToBinding, formatBindingString, isReserved } from "./binding";
import { findConflicts, getEffectiveBinding, setBinding } from "./registry";

export interface KeyRecorderProps {
  actionId: ActionId;
  /** Called after saving, disabling or cancelling; the parent goes back to showing the pill. */
  onDone: () => void;
  className?: string;
}

type Evaluation =
  | { kind: "empty" }
  /** First key of a chord action: nothing to check until the second one arrives. */
  | { kind: "pending"; first: string }
  | { kind: "ok"; binding: string }
  | { kind: "reserved"; binding: string }
  | { kind: "conflict"; binding: string; conflicts: ActionId[] };

/** The action's own default is always accepted, even when it is a reserved key (arrows). */
function allowedFor(id: ActionId, binding: string): boolean {
  const action = getAction(id);
  return binding === action.defaultBinding || !isReserved(binding, action.scopes);
}

function evaluate(id: ActionId, strokes: string[]): Evaluation {
  if (strokes.length === 0) return { kind: "empty" };
  // A lone `G` would "conflict" with every `G x` chord by prefix: wait for the second key.
  if (getAction(id).chord && strokes.length === 1) return { kind: "pending", first: strokes[0] };
  const binding = strokes.join(" ");
  if (!allowedFor(id, binding)) return { kind: "reserved", binding };
  const conflicts = findConflicts(id, binding);
  return conflicts.length > 0 ? { kind: "conflict", binding, conflicts } : { kind: "ok", binding };
}

/**
 * Swapping gives the other action this one's current binding. Only offered for a single,
 * remappable conflict whose new binding would be valid and free.
 */
function canSwap(id: ActionId, conflicts: ActionId[]): boolean {
  if (conflicts.length !== 1) return false;
  const [other] = conflicts;
  if (!getAction(other).remappable) return false;
  const current = getEffectiveBinding(id);
  if (current === null) return true;
  return allowedFor(other, current) && findConflicts(other, current).every((c) => c === id);
}

const isBare = (event: KeyboardEvent, key: string) =>
  event.key === key && !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey;

/**
 * Inline shortcut capture for Settings → Atajos. The next valid combination is shown; `Enter`
 * saves, `Escape` cancels and `Backspace` leaves the action without a shortcut. Reserved
 * combinations are rejected and conflicts offer swap / replace / cancel.
 *
 * Key presses are handled on the element and marked `defaultPrevented`, which makes the app's
 * single window listener ignore them, so no shortcut fires while recording.
 */
export function KeyRecorder({ actionId, onDone, className }: KeyRecorderProps) {
  const action = getAction(actionId);
  const name = t(action.labelKey);
  const [strokes, setStrokes] = useState<string[]>([]);
  const captureRef = useRef<HTMLDivElement>(null);
  const binding = strokes.length > 0 ? strokes.join(" ") : null;
  const evaluation = evaluate(actionId, strokes);

  useEffect(() => {
    captureRef.current?.focus();
  }, []);

  const save = (value: string | null) => {
    setBinding(actionId, value);
    onDone();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Tab") return; // let focus move; blur cancels
    event.preventDefault();
    event.stopPropagation();
    if (isBare(event, "Escape")) return onDone();
    if (isBare(event, "Backspace")) return save(null);
    if (isBare(event, "Enter")) {
      if (evaluation.kind === "ok") save(evaluation.binding);
      return;
    }
    const stroke = eventToBinding(event.nativeEvent);
    if (!stroke) return;
    // Chord actions take a second key (`G` then `T`); a third press starts over.
    setStrokes((current) =>
      action.chord && current.length === 1 ? [...current, stroke] : [stroke],
    );
  };

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onDone();
  };

  const swap = (conflicts: ActionId[], next: string) => {
    setBinding(conflicts[0], getEffectiveBinding(actionId));
    save(next);
  };

  const replace = (conflicts: ActionId[], next: string) => {
    for (const other of conflicts) setBinding(other, null);
    save(next);
  };

  const conflictsRemappable =
    evaluation.kind === "conflict" && evaluation.conflicts.every((c) => getAction(c).remappable);

  return (
    <div className={cn("flex flex-col gap-2", className)} onBlur={onBlur}>
      <div
        ref={captureRef}
        role="textbox"
        aria-readonly="true"
        tabIndex={0}
        aria-label={t("settings.recorder.label", { name })}
        aria-describedby={`key-recorder-${actionId}-status`}
        onKeyDown={onKeyDown}
        data-testid="key-recorder"
        className={cn(
          "inline-flex min-h-[32px] w-fit min-w-[180px] items-center gap-2 rounded-full border-2 border-accent bg-surface px-3 text-sm outline-none",
          "shadow-(--shadow-glow)",
          evaluation.kind === "empty" && "animate-pulse motion-reduce:animate-none",
          evaluation.kind === "reserved" && "border-danger",
        )}
      >
        {binding ? (
          <>
            <Kbd combo={formatBindingString(strokes[0])} size="sm" />
            {strokes.length > 1 ? (
              <>
                <span className="text-text-muted">{t("hotkeys.key.chordSeparator").trim()}</span>
                <Kbd combo={formatBindingString(strokes[1])} size="sm" />
              </>
            ) : action.chord ? (
              <span className="text-text-faint">…</span>
            ) : null}
          </>
        ) : (
          <span className="text-text-muted">{t("settings.recorder.prompt")}</span>
        )}
      </div>

      <div id={`key-recorder-${actionId}-status`} aria-live="polite" className="text-xs">
        {evaluation.kind === "reserved" ? (
          <p className="text-danger">{t("settings.recorder.reserved")}</p>
        ) : evaluation.kind === "conflict" ? (
          <div className="flex flex-col gap-2">
            <p className="text-text">
              {t("settings.recorder.conflict", {
                name: t(getAction(evaluation.conflicts[0]).labelKey),
                scope: t(`hotkeys.scope.${getAction(evaluation.conflicts[0]).scopes[0]}`),
              })}
            </p>
            <div className="flex flex-wrap gap-2">
              {canSwap(actionId, evaluation.conflicts) ? (
                <Button
                  size="sm"
                  variant="soft"
                  onClick={() => swap(evaluation.conflicts, evaluation.binding)}
                >
                  {t("settings.recorder.swap")}
                </Button>
              ) : null}
              {conflictsRemappable ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => replace(evaluation.conflicts, evaluation.binding)}
                >
                  {t("settings.recorder.replace")}
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" onClick={onDone}>
                {t("settings.recorder.cancel")}
              </Button>
            </div>
          </div>
        ) : evaluation.kind === "pending" ? (
          <p className="text-text-muted">
            {t("settings.recorder.chordNext", { keys: formatBindingString(evaluation.first) })}
          </p>
        ) : (
          <p className="text-text-muted">
            {evaluation.kind === "ok" ? (
              <span className="sr-only">{formatBindingString(evaluation.binding)}. </span>
            ) : null}
            {t("settings.recorder.hint")}
          </p>
        )}
      </div>
    </div>
  );
}
