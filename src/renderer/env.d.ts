/// <reference types="vite/client" />

import type { Task, Column, Attachment, Note, Tag, TaskWithAttachments, TaskTemplate, TaskStats, Rule, Board, BoardFile } from '../shared/types';

interface ElectronAPI {
  getFilePath: (file: File) => string;
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

  // Export / Import / Backup
  exportData: () => Promise<{ success: boolean; filePath?: string }>;
  importData: () => Promise<{ success: boolean; error?: string }>;
  listBackups: () => Promise<{ name: string; path: string; date: string; size: number }[]>;
  createBackup: () => Promise<{ success: boolean; backupPath?: string }>;
  restoreBackup: (backupPath: string) => Promise<{ success: boolean }>;

  // Templates
  getTemplates: () => Promise<TaskTemplate[]>;
  createTemplate: (data: unknown) => Promise<TaskTemplate>;
  deleteTemplate: (id: string) => Promise<boolean>;

  // Settings
  getAllSettings: () => Promise<Record<string, string>>;
  getSetting: (key: string) => Promise<string | null>;
  setSetting: (key: string, value: string) => Promise<boolean>;
  getAutoLaunch: () => Promise<boolean>;
  setAutoLaunch: (enable: boolean) => Promise<boolean>;
  reloadHotkeys: () => void;

  onGrabText: (cb: (text: string) => void) => () => void;
  onGrabFiles: (cb: (files: string[]) => void) => () => void;
  onShowCreateDialog: (cb: () => void) => () => void;
  onShowQuickNote: (cb: () => void) => () => void;

  // Archive
  archiveTask: (id: string) => Promise<boolean>;
  unarchiveTask: (id: string) => Promise<boolean>;
  getArchivedTasks: () => Promise<TaskWithAttachments[]>;
  getTaskStats: () => Promise<TaskStats>;

  // Related tasks
  getRelatedTasks: (taskId: string) => Promise<Task[]>;
  addRelatedTask: (taskId: string, relatedId: string) => Promise<boolean>;
  removeRelatedTask: (taskId: string, relatedId: string) => Promise<boolean>;

  // Reminders
  onReminderShow: (cb: (taskId: string) => void) => () => void;

  // Widget
  ipcSend: (channel: string, ...args: unknown[]) => void;
  onWidgetOpenTask?: (cb: (taskId: string) => void) => () => void;

  // Focus sessions
  focusStart?: (taskId: string | null) => Promise<{ id: string; task_id: string | null; started_at: string }>;
  focusEnd?: (id: string, duration: number, notes: string | null) => Promise<unknown>;
  focusGetByTask?: (taskId: string) => Promise<unknown[]>;
  focusGetTotalTime?: (taskId: string) => Promise<number>;
  focusUpdateTime?: (taskId: string, seconds: number) => Promise<boolean>;
  focusComplete?: (taskId: string, seconds: number) => Promise<boolean>;
  onFocusSetTask?: (cb: (taskId: string) => void) => () => void;

  // Recurring tasks
  recurringSetRule?: (taskId: string, rule: string | null, startDate: string | null) => Promise<boolean>;

  // Refresh signal
  onTasksRefresh?: (cb: () => void) => () => void;

  // Quick capture / screenshot
  onGrabInstant?: (cb: (clipText: string) => void) => () => void;
  onScreenshotCapture?: (cb: () => void) => () => void;
  onAutomationToast?: (cb: (message: string) => void) => () => void;
  runAutomation?: () => Promise<{ ok: boolean }>;

  // AI assistant
  aiQuery?: (payload: {
    provider: 'openrouter' | 'ollama';
    model: string;
    apiKey: string | null;
    baseUrl: string | null;
    messages: { role: string; content: string }[];
  }) => Promise<{ content: string }>;

  // Smart Rules
  getRules?: () => Promise<Rule[]>;
  createRule?: (data: unknown) => Promise<Rule>;
  updateRule?: (id: string, data: unknown) => Promise<Rule>;
  deleteRule?: (id: string) => Promise<boolean>;
  runRules?: () => Promise<{ actionsApplied: number }>;

  // Boards
  getBoards: () => Promise<Board[]>;
  createBoard: (data: unknown) => Promise<Board>;
  updateBoard: (id: string, data: unknown) => Promise<Board>;
  deleteBoard: (id: string) => Promise<boolean>;

  // Global Search
  onSearchOpen?: (cb: () => void) => () => void;

  // Board Files
  boardFilesGetAll?: (boardId: string) => Promise<BoardFile[]>;
  boardFilesAdd?: (boardId: string, filePath: string, taskId: string | null) => Promise<BoardFile>;
  boardFilesDelete?: (id: string) => Promise<boolean>;
  boardFilesAttachToTask?: (fileId: string, taskId: string | null) => Promise<boolean>;
  boardFilesOpenDialog?: () => Promise<string[]>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
