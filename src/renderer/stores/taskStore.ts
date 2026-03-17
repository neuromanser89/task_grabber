import { create } from 'zustand';
import type { Task, Tag, TaskWithAttachments } from '@shared/types';

interface TaskState {
  tasks: TaskWithAttachments[];
  loading: boolean;

  fetchAll: () => Promise<void>;
  createTask: (data: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (id: string, columnId: string, sortOrder: number) => Promise<void>;
  addTaskToStore: (task: TaskWithAttachments) => void;
  updateTaskTags: (taskId: string, tags: Tag[]) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  loading: false,

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
}));
