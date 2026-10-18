import { create } from "zustand";
import type { Task } from "./model";
import type { SmartView, SortMode, TodoSelection } from "./views";

/** UI state of the to-do screen. Task data is never cached here: it comes from the repository. */
interface TodoUiState {
  selection: TodoSelection;
  /** Task shown in the detail panel (the panel is open when set). */
  selectedTaskId: string | null;
  /** Row that has keyboard focus (activates the `todo.row` scope). */
  focusedTaskId: string | null;
  /** Row to keep focused across re-renders (reorders, closing the detail) until another row takes focus. */
  pendingFocusId: string | null;
  /** Sort mode per list id; lists default to manual. */
  sortByList: Record<string, SortMode>;
  completedOpen: boolean;
  completedShowAll: boolean;
  /** Rows with their subtasks expanded inline. */
  expanded: Record<string, boolean>;
  /** Snapshots of tasks being completed, kept in place for the completion animation. */
  completing: Record<string, Task>;
  /** Row showing the inline delete confirmation. */
  confirmDeleteId: string | null;
  archivedOpen: boolean;
  newListOpen: boolean;
  /** Incremented to ask the main quick capture input for focus. */
  quickAddFocus: number;
}

interface TodoUiActions {
  selectView: (view: SmartView) => void;
  selectList: (listId: string) => void;
  openDetail: (taskId: string) => void;
  closeDetail: () => void;
  setFocusedTask: (taskId: string | null) => void;
  requestFocus: (taskId: string | null) => void;
  setSortMode: (listId: string, mode: SortMode) => void;
  toggleCompletedOpen: () => void;
  toggleCompletedShowAll: () => void;
  toggleExpanded: (taskId: string) => void;
  startCompleting: (task: Task) => void;
  finishCompleting: (taskId: string) => void;
  setConfirmDelete: (taskId: string | null) => void;
  toggleArchivedOpen: () => void;
  setNewListOpen: (open: boolean) => void;
  focusQuickAdd: () => void;
}

export type TodoStore = TodoUiState & TodoUiActions;

const initialState: TodoUiState = {
  selection: { kind: "view", view: "today" },
  selectedTaskId: null,
  focusedTaskId: null,
  pendingFocusId: null,
  sortByList: {},
  completedOpen: false,
  completedShowAll: false,
  expanded: {},
  completing: {},
  confirmDeleteId: null,
  archivedOpen: false,
  newListOpen: false,
  quickAddFocus: 0,
};

export const useTodoStore = create<TodoStore>((set) => ({
  ...initialState,
  selectView: (view) =>
    set({
      selection: { kind: "view", view },
      selectedTaskId: null,
      confirmDeleteId: null,
      pendingFocusId: null,
    }),
  selectList: (listId) =>
    set({
      selection: { kind: "list", listId },
      selectedTaskId: null,
      confirmDeleteId: null,
      pendingFocusId: null,
    }),
  openDetail: (taskId) => set({ selectedTaskId: taskId }),
  closeDetail: () => set({ selectedTaskId: null }),
  setFocusedTask: (taskId) =>
    set((state) => ({
      focusedTaskId: taskId,
      // Focusing another row cancels a pending focus request.
      pendingFocusId: taskId && taskId !== state.pendingFocusId ? null : state.pendingFocusId,
    })),
  requestFocus: (taskId) => set({ pendingFocusId: taskId }),
  setSortMode: (listId, mode) =>
    set((state) => ({ sortByList: { ...state.sortByList, [listId]: mode } })),
  toggleCompletedOpen: () => set((state) => ({ completedOpen: !state.completedOpen })),
  toggleCompletedShowAll: () => set((state) => ({ completedShowAll: !state.completedShowAll })),
  toggleExpanded: (taskId) =>
    set((state) => ({ expanded: { ...state.expanded, [taskId]: !state.expanded[taskId] } })),
  startCompleting: (task) =>
    set((state) => ({
      completing: { ...state.completing, [task.id]: { ...task, status: "done" } },
    })),
  finishCompleting: (taskId) =>
    set((state) => {
      if (!state.completing[taskId]) return state;
      const completing = { ...state.completing };
      delete completing[taskId];
      return { completing };
    }),
  setConfirmDelete: (taskId) => set({ confirmDeleteId: taskId }),
  toggleArchivedOpen: () => set((state) => ({ archivedOpen: !state.archivedOpen })),
  setNewListOpen: (open) => set({ newListOpen: open }),
  focusQuickAdd: () => set((state) => ({ quickAddFocus: state.quickAddFocus + 1 })),
}));

/** Back to the initial UI state. Tests only. */
export function resetTodoStore(): void {
  useTodoStore.setState(initialState);
}

export function sortModeOf(state: TodoUiState, listId: string): SortMode {
  return state.sortByList[listId] ?? "manual";
}
