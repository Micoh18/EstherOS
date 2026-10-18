import { useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { TimeFormat } from "../format";
import { useEventActions } from "../hooks";
import type { EventOccurrence } from "../model";
import { dayAtPoint, highlightDropTarget, pointerOf, type DragData } from "./dnd";
import { markDragEnd } from "./dragState";
import { EventChip } from "./EventChip";

/** Drag events between days. Dropping moves the whole series (v1) by the days travelled. */
export function CalendarDnd({
  timeFormat,
  children,
}: {
  timeFormat: TimeFormat;
  children: ReactNode;
}) {
  const actions = useEventActions();
  const [active, setActive] = useState<EventOccurrence | null>(null);
  // A small distance threshold keeps plain clicks (popover, selection) working.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragStart = (event: DragStartEvent) => {
    setActive((event.active.data.current as DragData | undefined)?.occurrence ?? null);
  };

  const onDragMove = (event: DragMoveEvent) => {
    const { x, y } = pointerOf(event);
    highlightDropTarget(x, y);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActive(null);
    markDragEnd();
    highlightDropTarget(null, null);
    const drag = event.active.data.current as DragData | undefined;
    const { x, y } = pointerOf(event);
    const day = dayAtPoint(x, y);
    if (!drag || !day) return;
    void actions.move(drag.occurrence, drag.sourceDay, day);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActive(null);
        markDragEnd();
        highlightDropTarget(null, null);
      }}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {active ? (
          <EventChip
            occurrence={active}
            timeFormat={timeFormat}
            className="w-[180px] shadow-(--shadow-lg)"
            tabIndex={-1}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
