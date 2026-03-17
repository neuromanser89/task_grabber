import { create } from 'zustand';
import type { Column } from '@shared/types';

interface ColumnState {
  columns: Column[];
  loading: boolean;

  fetchColumns: () => Promise<void>;
  createColumn: (data: Omit<Column, 'id' | 'created_at' | 'updated_at'>) => Promise<Column>;
  updateColumn: (id: string, data: Partial<Column>) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;
  reorderColumns: (columns: Column[]) => Promise<void>;
}

export const useColumnStore = create<ColumnState>((set, get) => ({
  columns: [],
  loading: false,

  fetchColumns: async () => {
    set({ loading: true });
    try {
      const columns = await window.electronAPI?.getColumns() ?? [];
      set({ columns });
    } finally {
      set({ loading: false });
    }
  },

  createColumn: async (data) => {
    const col = await window.electronAPI!.createColumn(data);
    set((s) => ({ columns: [...s.columns, col].sort((a, b) => a.sort_order - b.sort_order) }));
    return col;
  },

  updateColumn: async (id, data) => {
    const updated = await window.electronAPI!.updateColumn(id, data);
    set((s) => ({
      columns: s.columns.map((c) => (c.id === id ? { ...c, ...updated } : c)),
    }));
  },

  deleteColumn: async (id) => {
    await window.electronAPI!.deleteColumn(id);
    set((s) => ({ columns: s.columns.filter((c) => c.id !== id) }));
  },

  reorderColumns: async (newOrder) => {
    // Optimistically update
    set({ columns: newOrder });
    // Persist each column's new sort_order
    await Promise.all(
      newOrder.map((col, idx) => {
        if (col.sort_order !== idx) {
          return window.electronAPI!.updateColumn(col.id, { sort_order: idx });
        }
        return Promise.resolve();
      })
    );
  },
}));
