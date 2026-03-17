import { ipcMain, shell } from 'electron';
import { initDatabase } from './db/database';
import * as queries from './db/queries';
import type { Task, Column } from '../shared/types';

export function setupIpcHandlers() {
  initDatabase();

  // ─── Columns ──────────────────────────────────────────────────────────────
  ipcMain.handle('columns:getAll', () => queries.getAllColumns());

  ipcMain.handle('columns:create', (_e, data: Omit<Column, 'id' | 'created_at' | 'updated_at'>) =>
    queries.createColumn(data)
  );

  ipcMain.handle('columns:update', (_e, id: string, data: Partial<Column>) =>
    queries.updateColumn(id, data)
  );

  ipcMain.handle('columns:delete', (_e, id: string) => {
    queries.deleteColumn(id);
    return true;
  });

  // ─── Tasks ────────────────────────────────────────────────────────────────
  ipcMain.handle('tasks:getAll', () => {
    const tasks = queries.getAllTasks();
    return tasks.map((task) => ({
      ...task,
      attachments: queries.getAttachmentsByTaskId(task.id),
    }));
  });

  ipcMain.handle('tasks:create', (_e, data: Omit<Task, 'id' | 'created_at' | 'updated_at'>) =>
    queries.createTask(data)
  );

  ipcMain.handle('tasks:update', (_e, id: string, data: Partial<Task>) =>
    queries.updateTask(id, data)
  );

  ipcMain.handle('tasks:move', (_e, id: string, columnId: string, sortOrder: number) => {
    queries.moveTask(id, columnId, sortOrder);
    return true;
  });

  ipcMain.handle('tasks:delete', (_e, id: string) => {
    queries.deleteTask(id);
    return true;
  });

  // ─── Attachments ──────────────────────────────────────────────────────────
  ipcMain.handle('attachments:add', (_e, taskId: string, filePath: string) => {
    const path = require('path');
    const fs = require('fs');
    // Path traversal protection: resolve and validate
    const resolved = path.resolve(filePath);
    if (resolved.includes('..') || !fs.existsSync(resolved)) {
      throw new Error('Invalid file path');
    }
    const stats = fs.statSync(resolved);
    return queries.createAttachment({
      task_id: taskId,
      filename: path.basename(resolved),
      filepath: resolved,
      filesize: stats.size,
      mime_type: null,
    });
  });

  ipcMain.handle('attachments:delete', (_e, id: string) => {
    queries.deleteAttachment(id);
    return true;
  });

  // ─── Files ────────────────────────────────────────────────────────────────
  ipcMain.handle('file:open', (_e, filePath: string) => {
    const path = require('path');
    const fs = require('fs');
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
      throw new Error('File not found');
    }
    shell.openPath(resolved);
    return true;
  });
}
