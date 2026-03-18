import { app, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { initDatabase, closeDatabase } from './db/database';
import * as queries from './db/queries';
import { parseMsgFile } from './msg-parser';
import { copyToStorage, saveBufferToStorage } from './file-handler';
import { listBackups, restoreBackup, createBackup } from './backup';
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
      archived_at: null,
      reminder_at: null,
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

  // ─── Settings ─────────────────────────────────────────────────────────────
  ipcMain.handle('settings:getAll', () => queries.getAllSettings());

  ipcMain.handle('settings:get', (_e, key: string) => queries.getSetting(key));

  ipcMain.handle('settings:set', (_e, key: string, value: string) => {
    queries.setSetting(key, value);
    return true;
  });

  ipcMain.handle('settings:getAutoLaunch', () => {
    const loginSettings = app.getLoginItemSettings();
    return loginSettings.openAtLogin;
  });

  ipcMain.handle('settings:setAutoLaunch', (_e, enable: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enable });
    queries.setSetting('autoLaunch', enable ? 'true' : 'false');
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

  // ─── Templates ────────────────────────────────────────────────────────────
  ipcMain.handle('templates:getAll', () => queries.getAllTemplates());

  ipcMain.handle('templates:create', (_e, data: { title: string; description: string | null; priority: number; tags: string }) =>
    queries.createTemplate(data)
  );

  ipcMain.handle('templates:delete', (_e, id: string) => {
    queries.deleteTemplate(id);
    return true;
  });

  // ─── Archive ──────────────────────────────────────────────────────────────
  ipcMain.handle('tasks:archive', (_e, id: string) => {
    queries.archiveTask(id);
    return true;
  });

  ipcMain.handle('tasks:unarchive', (_e, id: string) => {
    queries.unarchiveTask(id);
    return true;
  });

  ipcMain.handle('tasks:getArchived', () => {
    const tasks = queries.getArchivedTasks();
    return tasks.map((task) => ({
      ...task,
      attachments: queries.getAttachmentsByTaskId(task.id),
      tags: queries.getTagsByTaskId(task.id),
    }));
  });

  ipcMain.handle('tasks:getStats', () => queries.getTaskStats());

  // ─── Related Tasks ─────────────────────────────────────────────────────────
  ipcMain.handle('related:get', (_e, taskId: string) => queries.getRelatedTasks(taskId));

  ipcMain.handle('related:add', (_e, taskId: string, relatedTaskId: string) => {
    queries.addRelatedTask(taskId, relatedTaskId);
    return true;
  });

  ipcMain.handle('related:remove', (_e, taskId: string, relatedTaskId: string) => {
    queries.removeRelatedTask(taskId, relatedTaskId);
    return true;
  });

  // ─── Export / Import ──────────────────────────────────────────────────────
  ipcMain.handle('data:export', async () => {
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Экспорт данных',
      defaultPath: `task_grabber_export_${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (canceled || !filePath) return { success: false };

    const data = queries.exportAllData();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true, filePath };
  });

  ipcMain.handle('data:import', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Импорт данных',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (canceled || filePaths.length === 0) return { success: false };

    const raw = fs.readFileSync(filePaths[0], 'utf-8');
    const data = JSON.parse(raw);

    if (!data.version || !data.tasks || !data.columns) {
      return { success: false, error: 'Неверный формат файла' };
    }

    queries.importAllData(data);
    return { success: true };
  });

  // ─── Focus Sessions ────────────────────────────────────────────────────────
  ipcMain.handle('focus:start', (_e, taskId: string | null) => queries.createFocusSession(taskId));

  ipcMain.handle('focus:end', (_e, id: string, duration: number, notes: string | null) =>
    queries.endFocusSession(id, duration, notes)
  );

  ipcMain.handle('focus:getByTask', (_e, taskId: string) => queries.getFocusSessionsByTask(taskId));

  ipcMain.handle('focus:getTotalTime', (_e, taskId: string) => queries.getTotalFocusTime(taskId));

  // ─── Backup ───────────────────────────────────────────────────────────────
  ipcMain.handle('backup:list', () => listBackups());

  ipcMain.handle('backup:create', () => {
    const backupPath = createBackup();
    return { success: !!backupPath, backupPath };
  });

  ipcMain.handle('backup:restore', async (_e, backupPath: string) => {
    // Close DB, restore, re-init
    closeDatabase();
    restoreBackup(backupPath);
    initDatabase();
    return { success: true };
  });

  // ─── AI Query ─────────────────────────────────────────────────────────────
  ipcMain.handle('ai:query', async (_e, payload: {
    provider: 'openrouter' | 'ollama';
    model: string;
    apiKey: string | null;
    baseUrl: string | null;
    messages: { role: string; content: string }[];
  }) => {
    const { provider, model, apiKey, baseUrl, messages } = payload;

    let endpoint: string;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (provider === 'ollama') {
      endpoint = `${baseUrl ?? 'http://localhost:11434'}/v1/chat/completions`;
    } else {
      // openrouter
      endpoint = 'https://openrouter.ai/api/v1/chat/completions';
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
        headers['HTTP-Referer'] = 'task-grabber';
      }
    }

    const body = JSON.stringify({ model, messages, stream: false });

    // Use Node.js built-in fetch (available in Node 18+/Electron 28+)
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`AI request failed ${response.status}: ${text.slice(0, 200)}`);
    }

    const data = await response.json() as { choices: { message: { content: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? '';
    return { content };
  });

  // ─── Recurring Tasks ────────────────────────────────────────────────────────
  ipcMain.handle('recurring:setRule', (_e, taskId: string, rule: string | null, startDate: string | null) => {
    queries.updateTask(taskId, {
      recurrence_rule: rule as Task['recurrence_rule'],
      recurrence_next: startDate,
    });
    return true;
  });
}
