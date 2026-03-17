import { app, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { initDatabase } from './db/database';
import * as queries from './db/queries';
import { parseMsgFile } from './msg-parser';
import { copyToStorage, saveBufferToStorage } from './file-handler';
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
      tags: queries.getTagsByTaskId(task.id),
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
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      throw new Error('Invalid file path');
    }
    const dest = copyToStorage(resolved);
    const stats = fs.statSync(resolved);
    return queries.createAttachment({
      task_id: taskId,
      filename: path.basename(resolved),
      filepath: dest,
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
    const resolved = path.resolve(filePath);
    const storageDir = path.join(app.getPath('userData'), 'storage');
    // Only allow opening files from our storage directory
    if (!resolved.startsWith(storageDir) || !fs.existsSync(resolved)) {
      throw new Error('Access denied: can only open files from storage');
    }
    shell.openPath(resolved);
    return true;
  });

  // ─── MSG Parsing ──────────────────────────────────────────────────────────
  ipcMain.handle('msg:parse', (_e, filePath: string) => {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
      throw new Error('File not found');
    }
    const parsed = parseMsgFile(resolved);

    // Get default column for the new task
    const columns = queries.getAllColumns();
    const defaultCol = columns.find((c) => c.is_default === 1) ?? columns[0];
    if (!defaultCol) throw new Error('No columns found');

    const tasksInCol = queries.getTasksByColumnId(defaultCol.id);
    const maxOrder = tasksInCol.length > 0
      ? Math.max(...tasksInCol.map((t) => t.sort_order)) + 1
      : 0;

    // Create task automatically
    const task = queries.createTask({
      title: parsed.subject,
      description: parsed.body || null,
      column_id: defaultCol.id,
      sort_order: maxOrder,
      priority: 0,
      color: null,
      source_type: 'email',
      source_info: JSON.stringify({
        from: parsed.from,
        to: parsed.to,
        date: parsed.date,
        subject: parsed.subject,
      }),
      due_date: null,
    });

    // Save msg attachments to storage
    const savedAttachments = [];
    for (const att of parsed.attachments) {
      const dest = saveBufferToStorage(att.filename, att.content);
      const stats = fs.statSync(dest);
      const attachment = queries.createAttachment({
        task_id: task.id,
        filename: att.filename,
        filepath: dest,
        filesize: stats.size,
        mime_type: null,
      });
      savedAttachments.push(attachment);
    }

    return {
      ...task,
      attachments: savedAttachments,
      tags: [],
    };
  });

  // ─── Tags ─────────────────────────────────────────────────────────────────
  ipcMain.handle('tags:getAll', () => queries.getAllTags());

  ipcMain.handle('tags:create', (_e, name: string, color: string) =>
    queries.createTag(name, color)
  );

  ipcMain.handle('tags:delete', (_e, id: string) => {
    queries.deleteTag(id);
    return true;
  });

  ipcMain.handle('task-tags:add', (_e, taskId: string, tagId: string) => {
    queries.addTagToTask(taskId, tagId);
    return true;
  });

  ipcMain.handle('task-tags:remove', (_e, taskId: string, tagId: string) => {
    queries.removeTagFromTask(taskId, tagId);
    return true;
  });

  // ─── Notes ────────────────────────────────────────────────────────────────
  ipcMain.handle('notes:getAll', () => queries.getAllNotes());

  ipcMain.handle('notes:create', (_e, content: string) => queries.createNote(content));

  ipcMain.handle('notes:update', (_e, id: string, content: string) =>
    queries.updateNote(id, content)
  );

  ipcMain.handle('notes:delete', (_e, id: string) => {
    queries.deleteNote(id);
    return true;
  });
}
