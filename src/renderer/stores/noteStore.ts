import { create } from 'zustand';
import type { Note } from '@shared/types';

interface NoteState {
  notes: Note[];
  loading: boolean;

  fetchNotes: () => Promise<void>;
  createNote: (content: string) => Promise<Note>;
  updateNote: (id: string, content: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
}

export const useNoteStore = create<NoteState>((set) => ({
  notes: [],
  loading: false,

  fetchNotes: async () => {
    set({ loading: true });
    try {
      const notes = await window.electronAPI?.getNotes() ?? [];
      set({ notes });
    } finally {
      set({ loading: false });
    }
  },

  createNote: async (content) => {
    const note = await window.electronAPI!.createNote(content);
    set((s) => ({ notes: [note, ...s.notes] }));
    return note;
  },

  updateNote: async (id, content) => {
    const updated = await window.electronAPI!.updateNote(id, content);
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? updated : n)),
    }));
  },

  deleteNote: async (id) => {
    await window.electronAPI!.deleteNote(id);
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
  },
}));
