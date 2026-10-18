import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { t } from "@/shared/i18n";
import { Button, cn } from "@/shared/ui";
import type { Task, TodoList } from "../model";
import type { TaskMeta } from "../hooks";
import { useTodoStore } from "../store";
import { TaskRow } from "./TaskRow";

const ease = [0.33, 0.9, 0.35, 1] as const;

export interface RowContext {
  meta: TaskMeta;
  /** When set, rows show the chip of their list. */
  listsById?: Map<string, TodoList>;
}

function AnimatedRow({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.li
      // Clip only while the height animates, so dragged rows are never cut.
      initial={{ opacity: 0, overflow: "hidden", ...(reduceMotion ? {} : { height: 0 }) }}
      animate={{ opacity: 1, height: "auto", transitionEnd: { overflow: "visible" } }}
      exit={{ opacity: 0, overflow: "hidden", ...(reduceMotion ? {} : { height: 0 }) }}
      transition={{ duration: 0.2, ease }}
    >
      {children}
    </motion.li>
  );
}

function rowProps(task: Task, { meta, listsById }: RowContext) {
  return {
    task,
    progress: meta.progress.get(task.id),
    tags: meta.tags.get(task.id),
    list: listsById?.get(task.listId) ?? null,
  };
}

/** Plain list of rows (no manual reorder). */
export function TaskRows({ tasks, context }: { tasks: Task[]; context: RowContext }) {
  return (
    <ul className="flex flex-col">
      <AnimatePresence initial={false}>
        {tasks.map((task) => (
          <AnimatedRow key={task.id}>
            <TaskRow {...rowProps(task, context)} />
          </AnimatedRow>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function SortableRow({ task, context }: { task: Task; context: RowContext }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(0, ${Math.round(transform.y)}px, 0)` : undefined,
        transition,
      }}
      className={cn(
        "relative",
        isDragging && "z-10 rounded-md bg-surface shadow-(--shadow-md) [&_*]:cursor-grabbing",
      )}
    >
      <TaskRow {...rowProps(task, context)} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

/** Rows that can be reordered by dragging; `onReorder` receives the new order of ids. */
export function SortableTaskRows({
  tasks,
  context,
  onReorder,
}: {
  tasks: Task[];
  context: RowContext;
  onReorder: (orderedIds: string[]) => void;
}) {
  // Optimistic order until the reload after the write arrives with a new `tasks` array.
  const [override, setOverride] = useState<{ base: Task[]; ids: string[] } | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const byId = new Map(tasks.map((task) => [task.id, task]));
  const ordered =
    override && override.base === tasks
      ? override.ids.map((id) => byId.get(id)).filter((task): task is Task => task !== undefined)
      : tasks;
  const ids = ordered.map((task) => task.id);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    setOverride({ base: tasks, ids: next });
    onReorder(next);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col">
          <AnimatePresence initial={false}>
            {ordered.map((task) => (
              <AnimatedRow key={task.id}>
                <SortableRow task={task} context={context} />
              </AnimatedRow>
            ))}
          </AnimatePresence>
        </ul>
      </SortableContext>
    </DndContext>
  );
}

export function SectionHeading({ children, tone }: { children: ReactNode; tone?: "danger" }) {
  return (
    <h3
      className={cn(
        "mt-4 mb-1 px-3 font-display text-sm font-semibold",
        tone === "danger" ? "text-danger" : "text-text-muted",
      )}
    >
      {children}
    </h3>
  );
}

/** Collapsible "Completadas (N)" with the last 30 days and "Ver más". */
export function CompletedSection({
  recent,
  older,
  context,
}: {
  recent: Task[];
  older: Task[];
  context: RowContext;
}) {
  const open = useTodoStore((state) => state.completedOpen);
  const showAll = useTodoStore((state) => state.completedShowAll);
  const { toggleCompletedOpen, toggleCompletedShowAll } = useTodoStore.getState();
  const total = recent.length + older.length;
  if (total === 0) return null;

  return (
    <section className="mt-6">
      <button
        type="button"
        onClick={toggleCompletedOpen}
        aria-expanded={open}
        className="flex items-center gap-1 rounded-full px-3 py-1 font-display text-sm font-semibold text-text-muted outline-none hover:bg-surface-hover focus-visible:shadow-(--shadow-glow)"
      >
        {open ? (
          <ChevronDown aria-hidden className="size-4" />
        ) : (
          <ChevronRight aria-hidden className="size-4" />
        )}
        {t("todo.section.completed", { count: total })}
      </button>
      {open ? (
        <>
          <TaskRows tasks={showAll ? [...recent, ...older] : recent} context={context} />
          {older.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 ml-2"
              onClick={toggleCompletedShowAll}
            >
              {t(showAll ? "todo.section.showLess" : "todo.section.showMore")}
            </Button>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
