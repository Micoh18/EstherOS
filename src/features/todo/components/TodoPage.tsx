import { useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router";
import { useHotkey, useScope, type ActionId } from "@/shared/hotkeys";
import { log } from "@/shared/lib/log";
import { useLists, useToday } from "../hooks";
import { INBOX_LIST_ID, type TaskPriority } from "../model";
import { getTask, setDue, setPriority, updateTask } from "../repository";
import { readTodoLink, viewForDate, type TodoLink } from "../routes";
import { useTodoStore } from "../store";
import { addDaysISO, type DateISO } from "@/shared/lib/dates";
import { defaultDueFor, type SmartView } from "../views";
import { NewListDialog } from "./NewListDialog";
import { QuickAdd } from "./QuickAdd";
import { TaskDetail } from "./TaskDetail";
import { TaskListView } from "./TaskListView";
import { TodoHeader } from "./TodoHeader";
import { TodoSidebar } from "./TodoSidebar";

function ViewHotkey({ actionId, view }: { actionId: ActionId; view: SmartView }) {
  useHotkey(actionId, () => useTodoStore.getState().selectView(view));
  return null;
}

const VIEW_HOTKEYS: { actionId: ActionId; view: SmartView }[] = [
  { actionId: "todo.viewToday", view: "today" },
  { actionId: "todo.viewUpcoming", view: "upcoming" },
  { actionId: "todo.viewOverdue", view: "overdue" },
  { actionId: "todo.viewAll", view: "all" },
];

const PRIORITY_HOTKEYS: { actionId: ActionId; priority: TaskPriority }[] = [
  { actionId: "todo.priorityHigh", priority: "high" },
  { actionId: "todo.priorityMedium", priority: "medium" },
  { actionId: "todo.priorityLow", priority: "low" },
  { actionId: "todo.priorityNone", priority: "none" },
];

function PriorityHotkey({
  actionId,
  priority,
  target,
}: {
  actionId: ActionId;
  priority: TaskPriority;
  target: string | null;
}) {
  useHotkey(
    actionId,
    () => {
      if (target) void setPriority(target, priority).catch((e: unknown) => log.error(e));
    },
    { enabled: target !== null },
  );
  return null;
}

/** Applies a link from another screen: open a task, a smart view or the view of a day. */
async function openTodoLink(link: TodoLink, today: DateISO): Promise<void> {
  const store = useTodoStore.getState();
  if (link.kind === "view") return store.selectView(link.view);
  if (link.kind === "date") return store.selectView(viewForDate(link.date, today));
  const task = await getTask(link.taskId);
  if (!task) return;
  // A list shows every top-level task, whatever its date; subtasks open inside their parent.
  const parent = task.parentId ? await getTask(task.parentId) : null;
  store.selectList((parent ?? task).listId);
  store.openDetail(task.id);
}

/** Screen "Tareas": inner sidebar, the active list or view, and the detail panel. */
export function TodoPage() {
  useScope("todo");
  const focusedTaskId = useTodoStore((state) => state.focusedTaskId);
  useScope("todo.row", focusedTaskId !== null);

  const today = useToday();
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    const link = readTodoLink(params);
    if (!link) return;
    setParams({}, { replace: true });
    openTodoLink(link, today).catch((error: unknown) => log.error("todo: open link", error));
  }, [params, setParams, today]);

  const { data: lists, loading: listsLoading } = useLists(true);
  const selection = useTodoStore((state) => state.selection);
  const selectedTaskId = useTodoStore((state) => state.selectedTaskId);
  const quickAddFocus = useTodoStore((state) => state.quickAddFocus);
  const list =
    selection.kind === "list" ? (lists.find((item) => item.id === selection.listId) ?? null) : null;

  // A deleted list falls back to Inbox.
  useEffect(() => {
    if (selection.kind === "list" && !listsLoading && !list) {
      useTodoStore.getState().selectList(INBOX_LIST_ID);
    }
  }, [selection, listsLoading, list]);

  const { focusQuickAdd, setNewListOpen } = useTodoStore.getState();
  useHotkey("todo.quickAdd", focusQuickAdd);
  useHotkey("todo.newTask", focusQuickAdd);
  useHotkey("todo.newList", () => setNewListOpen(true));

  // Priority and date shortcuts act on the focused row, or else on the open detail.
  const target = focusedTaskId ?? selectedTaskId;
  const onTarget = (action: (id: string) => Promise<unknown>) => () => {
    if (target) void action(target).catch((error: unknown) => log.error("todo: hotkey", error));
  };
  const hasTarget = { enabled: target !== null };
  useHotkey(
    "todo.dueToday",
    onTarget((id) => updateTask(id, { dueDate: today })),
    hasTarget,
  );
  useHotkey(
    "todo.dueTomorrow",
    onTarget((id) => updateTask(id, { dueDate: addDaysISO(today, 1) })),
    hasTarget,
  );
  useHotkey(
    "todo.dueClear",
    onTarget((id) => setDue(id, null)),
    hasTarget,
  );

  return (
    <div className="flex h-full min-h-0">
      {VIEW_HOTKEYS.map((entry) => (
        <ViewHotkey key={entry.actionId} {...entry} />
      ))}
      {PRIORITY_HOTKEYS.map((entry) => (
        <PriorityHotkey key={entry.actionId} {...entry} target={target} />
      ))}

      <TodoSidebar lists={lists} today={today} />

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-col gap-4 px-8 pt-6 pb-3">
          <TodoHeader selection={selection} list={list} today={today} />
          <QuickAdd
            listId={selection.kind === "list" ? selection.listId : INBOX_LIST_ID}
            defaultDue={defaultDueFor(selection, today)}
            focusSignal={quickAddFocus}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          <TaskListView selection={selection} lists={lists} today={today} />
        </div>
      </section>

      <AnimatePresence>
        {selectedTaskId ? (
          <TaskDetail key={selectedTaskId} taskId={selectedTaskId} lists={lists} />
        ) : null}
      </AnimatePresence>

      <NewListDialog />
    </div>
  );
}
