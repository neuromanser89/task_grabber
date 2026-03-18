import { create } from 'zustand';
import type { Project } from '@shared/types';

interface ProjectStore {
  projects: Project[];
  loading: boolean;
  fetchProjects: () => Promise<void>;
  createProject: (data: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'tag_id' | 'sort_order'>) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  loading: false,

  fetchProjects: async () => {
    set({ loading: true });
    try {
      const projects = await window.electronAPI?.getProjects?.() ?? [];
      set({ projects });
    } finally {
      set({ loading: false });
    }
  },

  createProject: async (data) => {
    const project = await window.electronAPI!.createProject!(data);
    set((s) => ({ projects: [...s.projects, project] }));
    return project;
  },

  updateProject: async (id, data) => {
    const updated = await window.electronAPI!.updateProject!(id, data);
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? updated : p)),
    }));
  },

  deleteProject: async (id) => {
    await window.electronAPI!.deleteProject!(id);
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
  },
}));
