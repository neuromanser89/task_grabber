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
  createNote: (content: string) => ipcRenderer.invoke('notes:create', content),
  updateNote: (id: string, content: string) => ipcRenderer.invoke('notes:update', id, content),
  deleteNote: (id: string) => ipcRenderer.invoke('notes:delete', id),

  // MSG parsing — creates task automatically from .msg file
  parseMsg: (filePath: string) => ipcRenderer.invoke('msg:parse', filePath),

  // Tags
  getTags: () => ipcRenderer.invoke('tags:getAll'),
  createTag: (name: string, color: string) => ipcRenderer.invoke('tags:create', name, color),
  deleteTag: (id: string) => ipcRenderer.invoke('tags:delete', id),
  addTagToTask: (taskId: string, tagId: string) => ipcRenderer.invoke('task-tags:add', taskId, tagId),
  removeTagFromTask: (taskId: string, tagId: string) => ipcRenderer.invoke('task-tags:remove', taskId, tagId),

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
});
