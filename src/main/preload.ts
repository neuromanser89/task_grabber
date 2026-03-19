import { contextBridge, ipcRenderer, webUtils } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // File path from drag&drop (contextIsolation safe)
  getFilePath: (file: File) => webUtils.getPathForFile(file),

  // Window controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // Tasks
  getTasks: () => ipcRenderer.invoke('tasks:getAll'),
  createTask: (data: unknown) => ipcRenderer.invoke('tasks:create', data),
  updateTask: (id: string, data: unknown) => ipcRenderer.invoke('tasks:update', id, data),
  deleteTask: (id: string) => ipcRenderer.invoke('tasks:delete', id),
  moveTask: (id: string, columnId: string, sortOrder: number) =>
    ipcRenderer.invoke('tasks:move', id, columnId, sortOrder),

  // Boards
  getBoards: () => ipcRenderer.invoke('boards:getAll'),
  createBoard: (data: unknown) => ipcRenderer.invoke('boards:create', data),
  updateBoard: (id: string, data: unknown) => ipcRenderer.invoke('boards:update', id, data),
  deleteBoard: (id: string) => ipcRenderer.invoke('boards:delete', id),

  // Columns
  getColumns: () => ipcRenderer.invoke('columns:getAll'),
  createColumn: (data: unknown) => ipcRenderer.invoke('columns:create', data),
  updateColumn: (id: string, data: unknown) => ipcRenderer.invoke('columns:update', id, data),
  deleteColumn: (id: string) => ipcRenderer.invoke('columns:delete', id),

  // Attachments
  addAttachment: (taskId: string, filePath: string) =>
    ipcRenderer.invoke('attachments:add', taskId, filePath),
  deleteAttachment: (id: string) => ipcRenderer.invoke('attachments:delete', id),

  // Files
  openFile: (filePath: string) => ipcRenderer.invoke('file:open', filePath),

  // Notes
  getNotes: () => ipcRenderer.invoke('notes:getAll'),
  createNote: (content: string, title?: string | null) => ipcRenderer.invoke('notes:create', content, title),
  updateNote: (id: string, content: string, title?: string | null) => ipcRenderer.invoke('notes:update', id, content, title),
  deleteNote: (id: string) => ipcRenderer.invoke('notes:delete', id),

  // MSG parsing — creates task automatically from .msg file
  parseMsg: (filePath: string) => ipcRenderer.invoke('msg:parse', filePath),

  // Tags
  getTags: () => ipcRenderer.invoke('tags:getAll'),
  createTag: (name: string, color: string) => ipcRenderer.invoke('tags:create', name, color),
  updateTag: (id: string, data: { name?: string; color?: string }) => ipcRenderer.invoke('tags:update', id, data),
  deleteTag: (id: string) => ipcRenderer.invoke('tags:delete', id),
  addTagToTask: (taskId: string, tagId: string) => ipcRenderer.invoke('task-tags:add', taskId, tagId),
  removeTagFromTask: (taskId: string, tagId: string) => ipcRenderer.invoke('task-tags:remove', taskId, tagId),

  // Export / Import / Backup
  exportData: () => ipcRenderer.invoke('data:export'),
  importData: () => ipcRenderer.invoke('data:import'),
  listBackups: () => ipcRenderer.invoke('backup:list'),
  createBackup: () => ipcRenderer.invoke('backup:create'),
  restoreBackup: (backupPath: string) => ipcRenderer.invoke('backup:restore', backupPath),

  // Templates
  getTemplates: () => ipcRenderer.invoke('templates:getAll'),
  createTemplate: (data: unknown) => ipcRenderer.invoke('templates:create', data),
  deleteTemplate: (id: string) => ipcRenderer.invoke('templates:delete', id),

  // Settings
  getAllSettings: () => ipcRenderer.invoke('settings:getAll'),
  getSetting: (key: string) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
  getAutoLaunch: () => ipcRenderer.invoke('settings:getAutoLaunch'),
  setAutoLaunch: (enable: boolean) => ipcRenderer.invoke('settings:setAutoLaunch', enable),
  reloadHotkeys: () => ipcRenderer.send('hotkeys:reload'),

  // Events from main to renderer
  onGrabText: (callback: (text: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, text: string) => callback(text);
    ipcRenderer.on('grab:text', handler);
    return () => { ipcRenderer.removeListener('grab:text', handler); };
  },
  onGrabFiles: (callback: (files: string[]) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, files: string[]) => callback(files);
    ipcRenderer.on('grab:files', handler);
    return () => { ipcRenderer.removeListener('grab:files', handler); };
  },
  onShowCreateDialog: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('dialog:showCreate', handler);
    return () => { ipcRenderer.removeListener('dialog:showCreate', handler); };
  },
  onShowQuickNote: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('dialog:showQuickNote', handler);
    return () => { ipcRenderer.removeListener('dialog:showQuickNote', handler); };
  },

  // Archive
  archiveTask: (id: string) => ipcRenderer.invoke('tasks:archive', id),
  unarchiveTask: (id: string) => ipcRenderer.invoke('tasks:unarchive', id),
  getArchivedTasks: () => ipcRenderer.invoke('tasks:getArchived'),
  getTaskStats: () => ipcRenderer.invoke('tasks:getStats'),

  // Related tasks
  getRelatedTasks: (taskId: string) => ipcRenderer.invoke('related:get', taskId),
  addRelatedTask: (taskId: string, relatedId: string) => ipcRenderer.invoke('related:add', taskId, relatedId),
  removeRelatedTask: (taskId: string, relatedId: string) => ipcRenderer.invoke('related:remove', taskId, relatedId),

  // Reminders
  onReminderShow: (callback: (taskId: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, taskId: string) => callback(taskId);
    ipcRenderer.on('reminder:show', handler);
    return () => { ipcRenderer.removeListener('reminder:show', handler); };
  },

  // Quick Capture — instant mode (short hotkey press)
  onGrabInstant: (callback: (clipText: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, clipText: string) => callback(clipText);
    ipcRenderer.on('grab:instant', handler);
    return () => { ipcRenderer.removeListener('grab:instant', handler); };
  },

  // Screenshot capture hotkey
  onScreenshotCapture: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('screenshot:capture', handler);
    return () => { ipcRenderer.removeListener('screenshot:capture', handler); };
  },

  // Automation toasts from main process
  onAutomationToast: (callback: (message: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, message: string) => callback(message);
    ipcRenderer.on('automation:toast', handler);
    return () => { ipcRenderer.removeListener('automation:toast', handler); };
  },

  runAutomation: () => ipcRenderer.invoke('automation:run'),

  // Focus sessions
  focusStart: (taskId: string | null) => ipcRenderer.invoke('focus:start', taskId),
  focusEnd: (id: string, duration: number, notes: string | null) =>
    ipcRenderer.invoke('focus:end', id, duration, notes),
  focusGetByTask: (taskId: string) => ipcRenderer.invoke('focus:getByTask', taskId),
  focusGetTotalTime: (taskId: string) => ipcRenderer.invoke('focus:getTotalTime', taskId),
  focusUpdateTime: (taskId: string, seconds: number) => ipcRenderer.invoke('focus:update-time', taskId, seconds),
  focusComplete: (taskId: string, seconds: number) => ipcRenderer.invoke('focus:complete', taskId, seconds),

  // Generic IPC send (for widget → main communication)
  ipcSend: (channel: string, ...args: unknown[]) => {
    const allowed = ['widget:openTask', 'focus:openTask', 'widget:toggle', 'focus:close', 'focus:set-mini'];
    if (allowed.includes(channel)) ipcRenderer.send(channel, ...args);
  },

  // Widget: open task in main window (received by main window renderer)
  onWidgetOpenTask: (callback: (taskId: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, taskId: string) => callback(taskId);
    ipcRenderer.on('widget:openTask', handler);
    return () => { ipcRenderer.removeListener('widget:openTask', handler); };
  },

  // Focus window: receive task from main process
  onFocusSetTask: (callback: (taskId: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, taskId: string) => callback(taskId);
    ipcRenderer.on('focus:setTask', handler);
    return () => { ipcRenderer.removeListener('focus:setTask', handler); };
  },

  // AI assistant
  aiQuery: (payload: {
    provider: 'openrouter' | 'ollama';
    model: string;
    apiKey: string | null;
    baseUrl: string | null;
    messages: { role: string; content: string }[];
  }) => ipcRenderer.invoke('ai:query', payload),

  // Recurring tasks
  recurringSetRule: (taskId: string, rule: string | null, startDate: string | null) =>
    ipcRenderer.invoke('recurring:setRule', taskId, rule, startDate),

  // Board Files
  boardFilesGetAll: (boardId: string) => ipcRenderer.invoke('boardFiles:getAll', boardId),
  boardFilesTaskAttachments: (boardId: string) => ipcRenderer.invoke('boardFiles:taskAttachments', boardId),
  boardFilesAdd: (boardId: string, filePath: string, taskId: string | null) =>
    ipcRenderer.invoke('boardFiles:add', boardId, filePath, taskId),
  boardFilesDelete: (id: string) => ipcRenderer.invoke('boardFiles:delete', id),
  boardFilesAttachToTask: (fileId: string, taskId: string | null) =>
    ipcRenderer.invoke('boardFiles:attachToTask', fileId, taskId),
  boardFilesOpenDialog: () => ipcRenderer.invoke('boardFiles:openDialog'),

  // Smart Rules
  getRules: () => ipcRenderer.invoke('rules:getAll'),
  createRule: (data: unknown) => ipcRenderer.invoke('rules:create', data),
  updateRule: (id: string, data: unknown) => ipcRenderer.invoke('rules:update', id, data),
  deleteRule: (id: string) => ipcRenderer.invoke('rules:delete', id),
  runRules: () => ipcRenderer.invoke('rules:run'),

  // Listen for tasks refresh (triggered by recurring spawner etc.)
  onTasksRefresh: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('tasks:refresh', handler);
    return () => { ipcRenderer.removeListener('tasks:refresh', handler); };
  },

  // Global Search Overlay
  onSearchOpen: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('search:open', handler);
    return () => { ipcRenderer.removeListener('search:open', handler); };
  },

  // Task Updates
  getTaskUpdates: (taskId: string) => ipcRenderer.invoke('taskUpdates:get', taskId),
  createTaskUpdate: (taskId: string, content: string, createdAt?: string) =>
    ipcRenderer.invoke('taskUpdates:create', taskId, content, createdAt),
  updateTaskUpdate: (id: string, data: { content?: string; created_at?: string }) =>
    ipcRenderer.invoke('taskUpdates:update', id, data),
  deleteTaskUpdate: (id: string) => ipcRenderer.invoke('taskUpdates:delete', id),
  getTaskUpdateCounts: (taskIds: string[]) => ipcRenderer.invoke('taskUpdates:counts', taskIds),
  getLatestTaskUpdates: (taskIds: string[]) => ipcRenderer.invoke('taskUpdates:latest', taskIds),

  // Projects
  getProjects: () => ipcRenderer.invoke('projects:getAll'),
  createProject: (data: unknown) => ipcRenderer.invoke('projects:create', data),
  updateProject: (id: string, data: unknown) => ipcRenderer.invoke('projects:update', id, data),
  deleteProject: (id: string) => ipcRenderer.invoke('projects:delete', id),
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
});
