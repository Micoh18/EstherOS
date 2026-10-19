import type { KeyboardEvent } from "react";

const STEPS: Partial<Record<string, 1 | -1>> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

/**
 * `onKeyDown` for a `role="radiogroup"` container: the arrows move to the previous/next enabled
 * `[role="radio"]` inside it (wrapping), focus it and select it through `.click()`. Pair it with
 * `radioTabIndex` so the group is a single tab stop.
 */
export function onRadioGroupKeyDown(event: KeyboardEvent<HTMLElement>): void {
  const step = STEPS[event.key];
  if (!step || event.altKey || event.ctrlKey || event.metaKey) return;
  const radios = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]'),
  ).filter(
    (radio) => !radio.hasAttribute("disabled") && radio.getAttribute("aria-disabled") !== "true",
  );
  const current = radios.findIndex((radio) => radio.contains(event.target as Node));
  if (current === -1) return;
  // Also keeps app-level arrow shortcuts from running.
  event.preventDefault();
  event.stopPropagation();
  const next = radios[(current + step + radios.length) % radios.length];
  next.focus();
  next.click();
}

/** Roving tabindex of a radio: the checked one, or the first when none is checked. */
export function radioTabIndex(checked: boolean, index: number, anyChecked: boolean): 0 | -1 {
  return checked || (!anyChecked && index === 0) ? 0 : -1;
}
