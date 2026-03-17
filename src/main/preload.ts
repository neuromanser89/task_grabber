import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
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
});
