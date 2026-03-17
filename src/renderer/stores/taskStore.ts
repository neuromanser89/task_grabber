import { create } from 'zustand';
import type { Task, Tag, TaskWithAttachments, Priority, SourceType } from '@shared/types';

interface TaskState {
  tasks: TaskWithAttachments[];
  loading: boolean;

  // Filters
  searchQuery: string;
  filterTags: string[];        // tag IDs
  filterPriority: Priority[];
  filterSource: SourceType[];

  // Actions
  fetchAll: () => Promise<void>;
  createTask: (data: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (id: string, columnId: string, sortOrder: number) => Promise<void>;
  addTaskToStore: (task: TaskWithAttachments) => void;
  updateTaskTags: (taskId: string, tags: Tag[]) => void;

  // Filter actions
  setSearch: (q: string) => void;
  toggleTagFilter: (tagId: string) => void;
  togglePriorityFilter: (p: Priority) => void;
  toggleSourceFilter: (s: SourceType) => void;
  resetFilters: () => void;

  // Computed (function, not getter — zustand doesn't support getters)
  filteredTasks: () => TaskWithAttachments[];
}

function applyFilters(
  tasks: TaskWithAttachments[],
  searchQuery: string,
  filterTags: string[],
  filterPriority: Priority[],
  filterSource: SourceType[]
): TaskWithAttachments[] {
  let result = tasks;

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    result = result.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q)
    );
  }

  if (filterTags.length > 0) {
    result = result.filter((t) =>
      filterTags.every((tagId) => t.tags.some((tag) => tag.id === tagId))
    );
  }

  if (filterPriority.length > 0) {
    result = result.filter((t) => filterPriority.includes(t.priority ?? 0));
  }

  if (filterSource.length > 0) {
    result = result.filter((t) => filterSource.includes(t.source_type ?? 'manual'));
  }

  return result;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  searchQuery: '',
  filterTags: [],
  filterPriority: [],
  filterSource: [],

  fetchAll: async () => {
    set({ loading: true });
    try {
      const tasks = (await window.electronAPI?.getTasks() ?? []) as TaskWithAttachments[];
      set({ tasks });
    } finally {
      set({ loading: false });
    }
  },

  createTask: async (data) => {
    const task = await window.electronAPI!.createTask(data);
    set((s) => ({ tasks: [...s.tasks, { ...task, attachments: [], tags: [] }] }));
    return task;
  },

  updateTask: async (id, data) => {
    const updated = await window.electronAPI!.updateTask(id, data);
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updated } : t)),
    }));
  },

  deleteTask: async (id) => {
    await window.electronAPI!.deleteTask(id);
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  },

  moveTask: async (id, columnId, sortOrder) => {
    await window.electronAPI!.moveTask(id, columnId, sortOrder);
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, column_id: columnId, sort_order: sortOrder } : t)),
    }));
  },

  addTaskToStore: (task) => {
    set((s) => ({ tasks: [...s.tasks, task] }));
  },

  updateTaskTags: (taskId, tags) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, tags } : t)),
    }));
  },

  setSearch: (q) => set({ searchQuery: q }),

  toggleTagFilter: (tagId) =>
    set((s) => ({
      filterTags: s.filterTags.includes(tagId)
        ? s.filterTags.filter((id) => id !== tagId)
        : [...s.filterTags, tagId],
    })),

  togglePriorityFilter: (p) =>
    set((s) => ({
      filterPriority: s.filterPriority.includes(p)
        ? s.filterPriority.filter((x) => x !== p)
        : [...s.filterPriority, p],
    })),

  toggleSourceFilter: (src) =>
    set((s) => ({
      filterSource: s.filterSource.includes(src)
        ? s.filterSource.filter((x) => x !== src)
        : [...s.filterSource, src],
    })),

  resetFilters: () =>
    set({ searchQuery: '', filterTags: [], filterPriority: [], filterSource: [] }),

  filteredTasks: () => {
    const { tasks, searchQuery, filterTags, filterPriority, filterSource } = get();
    return applyFilters(tasks, searchQuery, filterTags, filterPriority, filterSource);
  },
}));
