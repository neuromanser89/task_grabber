/// <reference types="vite/client" />

import type { Task, Column, Attachment, Note, Tag, TaskWithAttachments } from '../shared/types';

interface ElectronAPI {
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;

  getTasks: () => Promise<(Task & { attachments: Attachment[]; tags: Tag[] })[]>;
  createTask: (data: unknown) => Promise<Task>;
  updateTask: (id: string, data: unknown) => Promise<Task>;
  deleteTask: (id: string) => Promise<boolean>;
  moveTask: (id: string, columnId: string, sortOrder: number) => Promise<boolean>;

  getColumns: () => Promise<Column[]>;
  createColumn: (data: unknown) => Promise<Column>;
  updateColumn: (id: string, data: unknown) => Promise<Column>;
  deleteColumn: (id: string) => Promise<boolean>;

  addAttachment: (taskId: string, filePath: string) => Promise<Attachment>;
  deleteAttachment: (id: string) => Promise<boolean>;

  openFile: (filePath: string) => Promise<boolean>;

  getNotes: () => Promise<Note[]>;
  createNote: (content: string) => Promise<Note>;
  updateNote: (id: string, content: string) => Promise<Note>;
  deleteNote: (id: string) => Promise<boolean>;

  // MSG
  parseMsg: (filePath: string) => Promise<TaskWithAttachments>;

  // Tags
  getTags: () => Promise<Tag[]>;
  createTag: (name: string, color: string) => Promise<Tag>;
  deleteTag: (id: string) => Promise<boolean>;
  addTagToTask: (taskId: string, tagId: string) => Promise<boolean>;
  removeTagFromTask: (taskId: string, tagId: string) => Promise<boolean>;

  onGrabText: (cb: (text: string) => void) => () => void;
  onGrabFiles: (cb: (files: string[]) => void) => () => void;
  onShowCreateDialog: (cb: () => void) => () => void;
  onShowQuickNote: (cb: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
