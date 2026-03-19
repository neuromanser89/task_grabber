import { app, ipcMain, shell, dialog, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { initDatabase, closeDatabase } from './db/database';
import * as queries from './db/queries';
import { parseMsgFile } from './msg-parser';
import { copyToStorage, saveBufferToStorage } from './file-handler';
import { listBackups, restoreBackup, createBackup } from './backup';
import { runSmartRules } from './smart-rules';
import type { Task, Column, Board, Rule } from '../shared/types';

export function setupIpcHandlers() {
  initDatabase();

  // ─── Boards ───────────────────────────────────────────────────────────────
  ipcMain.handle('boards:getAll', () => queries.getAllBoards());

  ipcMain.handle('boards:create', (_e, data: { name: string; color: string; icon?: string | null }) =>
    queries.createBoard(data)
  );

  ipcMain.handle('boards:update', (_e, id: string, data: Partial<Board>) =>
    queries.updateBoard(id, data)
  );

  ipcMain.handle('boards:delete', (_e, id: string) => {
    queries.deleteBoard(id);
    return true;
  });

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
    const result = queries.moveTask(id, columnId, sortOrder);
    return result;
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
    const stats = fs.statSync(resolved);
    // Limit file size to 100MB
    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    if (stats.size > MAX_FILE_SIZE) {
      throw new Error('File too large: maximum 100MB');
    }
    const dest = copyToStorage(resolved);
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
    if (!resolved.toLowerCase().endsWith('.msg')) {
      throw new Error('Only .msg files are supported');
    }
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

    // Create task automatically — description stays null, body is NOT inserted
    const task = queries.createTask({
      title: parsed.subject,
      description: null,
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

    // Attach the original .msg file itself
    const savedAttachments = [];
    const msgDest = copyToStorage(resolved);
    const msgStats = fs.statSync(msgDest);
    savedAttachments.push(queries.createAttachment({
      task_id: task.id,
      filename: path.basename(resolved),
      filepath: msgDest,
      filesize: msgStats.size,
      mime_type: 'application/vnd.ms-outlook',
    }));

    // Also save embedded attachments from the msg
    for (const att of parsed.attachments) {
      const dest = saveBufferToStorage(att.filename, att.content);
      const stats = fs.statSync(dest);
      savedAttachments.push(queries.createAttachment({
        task_id: task.id,
        filename: att.filename,
        filepath: dest,
        filesize: stats.size,
        mime_type: null,
      }));
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

  ipcMain.handle('notes:create', (_e, content: string, title?: string | null) => queries.createNote(content, title));

  ipcMain.handle('notes:update', (_e, id: string, content: string, title?: string | null) =>
    queries.updateNote(id, content, title)
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

    if (!data.version || !Array.isArray(data.tasks) || !Array.isArray(data.columns)) {
      return { success: false, error: 'Неверный формат файла' };
    }

    // Validate required fields in each object
    for (const col of data.columns) {
      if (!col.id || !col.name || col.sort_order == null) {
        return { success: false, error: 'Невалидная колонка: отсутствуют обязательные поля (id, name, sort_order)' };
      }
    }
    for (const task of data.tasks) {
      if (!task.id || !task.title || !task.column_id || task.sort_order == null) {
        return { success: false, error: 'Невалидная задача: отсутствуют обязательные поля (id, title, column_id, sort_order)' };
      }
    }
    if (Array.isArray(data.tags)) {
      for (const tag of data.tags) {
        if (!tag.id || !tag.name || !tag.color) {
          return { success: false, error: 'Невалидный тег: отсутствуют обязательные поля (id, name, color)' };
        }
      }
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

  ipcMain.handle('focus:update-time', (_e, taskId: string, seconds: number) => {
    queries.addTimeSpent(taskId, seconds);
    return true;
  });

  ipcMain.handle('focus:complete', (_e, taskId: string, seconds: number) => {
    // Add time, then move to done column
    queries.addTimeSpent(taskId, seconds);
    const columns = queries.getAllColumns();
    const doneCol = columns.find((c) => /готово|done|complete/i.test(c.name)) ?? columns[columns.length - 1];
    if (doneCol) {
      const tasksInDone = queries.getTasksByColumnId(doneCol.id);
      const maxOrder = tasksInDone.length > 0
        ? Math.max(...tasksInDone.map((t) => t.sort_order)) + 1
        : 0;
      queries.moveTask(taskId, doneCol.id, maxOrder);
    }
    return true;
  });

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
      // Validate baseUrl: only allow http(s), block file:/data:/ftp: etc.
      let ollamaBase = baseUrl ?? 'http://localhost:11434';
      try {
        const parsed = new URL(ollamaBase);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error('Invalid Ollama URL: only http/https allowed');
        }
      } catch {
        ollamaBase = 'http://localhost:11434';
      }
      endpoint = `${ollamaBase}/v1/chat/completions`;
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

  // ─── Board Files ──────────────────────────────────────────────────────────
  ipcMain.handle('boardFiles:getAll', (_e, boardId: string) => queries.getBoardFiles(boardId));

  ipcMain.handle('boardFiles:add', (_e, boardId: string, filePath: string, taskId: string | null) => {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      throw new Error('Invalid file path');
    }
    const stats = fs.statSync(resolved);
    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    if (stats.size > MAX_FILE_SIZE) throw new Error('File too large: maximum 100MB');
    const dest = copyToStorage(resolved);
    return queries.createBoardFile({
      board_id: boardId,
      task_id: taskId ?? null,
      filename: path.basename(resolved),
      filepath: dest,
      filesize: stats.size,
      mime_type: null,
    });
  });

  ipcMain.handle('boardFiles:delete', (_e, id: string) => {
    queries.deleteBoardFile(id);
    return true;
  });

  ipcMain.handle('boardFiles:attachToTask', (_e, fileId: string, taskId: string | null) => {
    queries.attachBoardFileToTask(fileId, taskId);
    return true;
  });

  ipcMain.handle('boardFiles:openDialog', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Выбрать файлы',
      properties: ['openFile', 'multiSelections'],
    });
    if (canceled) return [];
    return filePaths;
  });

  // ─── Smart Rules ────────────────────────────────────────────────────────────
  ipcMain.handle('rules:getAll', () => queries.getAllRules());

  ipcMain.handle('rules:create', (_e, data: Omit<Rule, 'id' | 'created_at'>) =>
    queries.createRule(data)
  );

  ipcMain.handle('rules:update', (_e, id: string, data: Partial<Omit<Rule, 'id' | 'created_at'>>) =>
    queries.updateRule(id, data)
  );

  ipcMain.handle('rules:delete', (_e, id: string) => {
    queries.deleteRule(id);
    return true;
  });

  ipcMain.handle('rules:run', (_e) => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null;
    const actionsApplied = runSmartRules(win);
    return { actionsApplied };
  });

  // ─── Projects ────────────────────────────────────────────────────────────────
  ipcMain.handle('projects:getAll', () => queries.getAllProjects());

  ipcMain.handle('projects:create', (_e, data) => queries.createProject(data));

  ipcMain.handle('projects:update', (_e, id: string, data) => queries.updateProject(id, data));

  ipcMain.handle('projects:delete', (_e, id: string) => {
    queries.deleteProject(id);
    return true;
  });

  ipcMain.handle('shell:openExternal', async (_e, url: string) => {
    await shell.openExternal(url);
  });
}
