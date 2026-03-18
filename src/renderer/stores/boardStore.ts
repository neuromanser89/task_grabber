import { create } from 'zustand';
import type { Board } from '@shared/types';

interface BoardState {
  boards: Board[];
  activeBoardId: string | null;
  loading: boolean;

  fetchBoards: () => Promise<void>;
  createBoard: (data: { name: string; color: string; icon?: string | null }) => Promise<Board>;
  updateBoard: (id: string, data: Partial<Board>) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  setActiveBoard: (id: string) => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  activeBoardId: null,
  loading: false,

  fetchBoards: async () => {
    set({ loading: true });
    try {
      const boards = (await window.electronAPI?.getBoards() ?? []) as Board[];
      set({ boards });
      // Set active board to first if not set or invalid
      const { activeBoardId } = get();
      if (!activeBoardId || !boards.find((b) => b.id === activeBoardId)) {
        const first = boards[0];
        if (first) set({ activeBoardId: first.id });
      }
    } finally {
      set({ loading: false });
    }
  },

  createBoard: async (data) => {
    const board = await window.electronAPI!.createBoard(data);
    set((s) => ({
      boards: [...s.boards, board].sort((a, b) => a.sort_order - b.sort_order),
    }));
    return board;
  },

  updateBoard: async (id, data) => {
    const updated = await window.electronAPI!.updateBoard(id, data);
    set((s) => ({
      boards: s.boards.map((b) => (b.id === id ? { ...b, ...updated } : b)),
    }));
  },

  deleteBoard: async (id) => {
    await window.electronAPI!.deleteBoard(id);
    const { boards, activeBoardId } = get();
    const remaining = boards.filter((b) => b.id !== id);
    const newActive = activeBoardId === id ? (remaining[0]?.id ?? null) : activeBoardId;
    set({ boards: remaining, activeBoardId: newActive });
  },

  setActiveBoard: (id) => set({ activeBoardId: id }),
}));
