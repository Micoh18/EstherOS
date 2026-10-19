import { useDraggable, type DragMoveEvent } from "@dnd-kit/core";
import type { DateISO } from "@/shared/lib/dates";
import type { EventOccurrence } from "../model";

export interface DragData {
  occurrence: EventOccurrence;
  /** Day cell or column the event was picked from. */
  sourceDay: DateISO;
}

/** Attribute marking a day cell or column as a drop target; its value is the day. */
export const DROP_DAY_ATTR = "data-drop-day";
/** Set on the target under the pointer while dragging (styled with `data-[drop-over]:`). */
const DROP_OVER_ATTR = "data-drop-over";

/** Makes an event draggable from `sourceDay`. Spread the result on the event element. */
export function useDraggableEvent(occurrence: EventOccurrence, sourceDay: DateISO) {
  const { setNodeRef, listeners, isDragging } = useDraggable({
    id: `${occurrence.key}@${sourceDay}`,
    data: { occurrence, sourceDay } satisfies DragData,
  });
  return {
    setNodeRef,
    isDragging,
    // Only the listeners: dnd-kit's attributes announce "press space to pick up", but dragging
    // is pointer only (no keyboard sensor), and the elements are native buttons already.
    dragProps: { ...listeners, "data-event-block": "" },
  };
}

/**
 * Drop targets are found under the pointer instead of registering one dnd-kit droppable per
 * cell: registering ~50 droppables re-rendered the whole drag context on every period change.
 */
export function dayAtPoint(x: number, y: number): DateISO | null {
  return targetAtPoint(x, y)?.getAttribute(DROP_DAY_ATTR) ?? null;
}

/** Topmost drop target under the point (the drag overlay itself is skipped). */
function targetAtPoint(x: number, y: number): Element | null {
  for (const element of document.elementsFromPoint(x, y)) {
    const target = element.closest(`[${DROP_DAY_ATTR}]`);
    if (target) return target;
  }
  return null;
}

/** Pointer position of a drag event (start position plus the distance travelled). */
export function pointerOf(event: Pick<DragMoveEvent, "activatorEvent" | "delta">) {
  const start = event.activatorEvent as PointerEvent;
  return { x: start.clientX + event.delta.x, y: start.clientY + event.delta.y };
}

let highlighted: Element | null = null;

/** Highlights the target under the pointer straight in the DOM (no React re-render). */
export function highlightDropTarget(x: number | null, y: number | null): void {
  const next = x !== null && y !== null ? targetAtPoint(x, y) : null;
  if (next === highlighted) return;
  highlighted?.removeAttribute(DROP_OVER_ATTR);
  next?.setAttribute(DROP_OVER_ATTR, "");
  highlighted = next;
}
