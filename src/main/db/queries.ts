import { getDb } from './database';
import { randomUUID as uuidv4 } from 'crypto';
import type { Task, Column, Attachment, Note, Tag, TaskTemplate, TaskStats, Board, Rule, BoardFile } from '../../shared/types';

const SAFE_FIELD_RE = /^[a-z_]+$/;

function safeFilterFields(data: Record<string, unknown>, allowed: string[]): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).filter(([k]) => allowed.includes(k) && SAFE_FIELD_RE.test(k))
  );
}

// ─── Boards ─────────────────────────────────────────────────────────────────

export function getAllBoards(): Board[] {
  return getDb().prepare('SELECT * FROM boards ORDER BY sort_order').all() as Board[];
}

export function createBoard(data: { name: string; color: string; icon?: string | null }): Board {
  const id = uuidv4();
  const sort_order = (getDb().prepare('SELECT COUNT(*) as n FROM boards').get() as { n: number }).n;
  getDb()
    .prepare('INSERT INTO boards (id, name, color, icon, sort_order) VALUES (?, ?, ?, ?, ?)')
    .run(id, data.name, data.color, data.icon ?? null, sort_order);
  return getDb().prepare('SELECT * FROM boards WHERE id = ?').get(id) as Board;
}

export function updateBoard(id: string, data: Partial<Board>): Board {
  const allowed = ['name', 'color', 'icon', 'sort_order'];
  const filtered = safeFilterFields(data as Record<string, unknown>, allowed);
  const fields = Object.keys(filtered).map((k) => `${k} = ?`).join(', ');
  if (fields) {
    getDb()
      .prepare(`UPDATE boards SET ${fields}, updated_at = datetime('now') WHERE id = ?`)
      .run(...Object.values(filtered), id);
  }
  return getDb().prepare('SELECT * FROM boards WHERE id = ?').get(id) as Board;
}

export function deleteBoard(id: string): void {
  // Reassign columns to another board before deleting
  const other = getDb().prepare('SELECT id FROM boards WHERE id != ? ORDER BY sort_order LIMIT 1').get(id) as { id: string } | undefined;
  if (other) {
    getDb().prepare('UPDATE columns SET board_id = ? WHERE board_id = ?').run(other.id, id);
  }
  getDb().prepare('DELETE FROM boards WHERE id = ?').run(id);
}

// ─── Columns ────────────────────────────────────────────────────────────────

export function getAllColumns(): Column[] {
  return getDb().prepare('SELECT * FROM columns ORDER BY sort_order').all() as Column[];
}

export function createColumn(data: Omit<Column, 'id' | 'created_at' | 'updated_at'>): Column {
  const id = uuidv4();
  getDb()
    .prepare(
      'INSERT INTO columns (id, name, color, icon, sort_order, is_default, board_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(id, data.name, data.color, data.icon, data.sort_order, data.is_default, data.board_id ?? null);
  return getDb().prepare('SELECT * FROM columns WHERE id = ?').get(id) as Column;
}

export function updateColumn(id: string, data: Partial<Column>): Column {
  const allowed = ['name', 'color', 'icon', 'sort_order', 'is_default', 'wip_limit', 'board_id'];
  const filtered = safeFilterFields(data as Record<string, unknown>, allowed);
  const fields = Object.keys(filtered)
    .map((k) => `${k} = ?`)
    .join(', ');
  if (fields) {
    getDb()
      .prepare(`UPDATE columns SET ${fields}, updated_at = datetime('now') WHERE id = ?`)
      .run(...Object.values(filtered), id);
  }
  return getDb().prepare('SELECT * FROM columns WHERE id = ?').get(id) as Column;
}

export function deleteColumn(id: string): void {
  getDb().prepare('DELETE FROM columns WHERE id = ?').run(id);
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export function getAllTasks(): Task[] {
  return getDb().prepare('SELECT * FROM tasks WHERE archived_at IS NULL ORDER BY column_id, sort_order').all() as Task[];
}

export function getArchivedTasks(): Task[] {
  return getDb().prepare('SELECT * FROM tasks WHERE archived_at IS NOT NULL ORDER BY archived_at DESC').all() as Task[];
}

export function archiveTask(id: string): void {
  getDb()
    .prepare("UPDATE tasks SET archived_at = datetime('now'), updated_at = datetime('now') WHERE id = ?")
    .run(id);
}

export function unarchiveTask(id: string): void {
  getDb()
    .prepare("UPDATE tasks SET archived_at = NULL, updated_at = datetime('now') WHERE id = ?")
    .run(id);
}

export function getTaskStats(): TaskStats {
  const db = getDb();
  const total = (db.prepare('SELECT COUNT(*) as n FROM tasks WHERE archived_at IS NULL').get() as { n: number }).n;
  const archivedTotal = (db.prepare('SELECT COUNT(*) as n FROM tasks WHERE archived_at IS NOT NULL').get() as { n: number }).n;

  const byColumn = db.prepare(`
    SELECT t.column_id, c.name as column_name, COUNT(*) as count
    FROM tasks t
    JOIN columns c ON c.id = t.column_id
    WHERE t.archived_at IS NULL
    GROUP BY t.column_id
    ORDER BY c.sort_order
  `).all() as { column_id: string; column_name: string; count: number }[];

  // Find "done" column — last column or one with is_default=0 and highest sort_order with name matching Готово
  const columns = getAllColumns();
  const doneCol = columns.find((c) => /готово|done|complete/i.test(c.name));
  const doneColAlt = columns.find((c) => /забито|cancel|discard/i.test(c.name));
  const doneIds = [doneCol?.id, doneColAlt?.id].filter(Boolean) as string[];
  const completedTotal = doneIds.length > 0
    ? (db.prepare(`SELECT COUNT(*) as n FROM tasks WHERE column_id IN (${doneIds.map(() => '?').join(',')}) AND archived_at IS NULL`).get(...doneIds) as { n: number }).n
    : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const createdToday = (db.prepare(`SELECT COUNT(*) as n FROM tasks WHERE date(created_at) = ?`).get(todayStr) as { n: number }).n;
  const createdThisWeek = (db.prepare(`SELECT COUNT(*) as n FROM tasks WHERE date(created_at) >= ?`).get(weekStartStr) as { n: number }).n;

  const byPriority = db.prepare(`
    SELECT priority, COUNT(*) as count
    FROM tasks
    WHERE archived_at IS NULL
    GROUP BY priority
    ORDER BY priority
  `).all() as { priority: number; count: number }[];

  return { total, byColumn, createdToday, createdThisWeek, completedTotal, archivedTotal, byPriority };
}

// ─── Related Tasks ───────────────────────────────────────────────────────────

export function getRelatedTasks(taskId: string): Task[] {
  return getDb().prepare(`
    SELECT t.* FROM tasks t
    INNER JOIN related_tasks rt ON (rt.related_task_id = t.id AND rt.task_id = ?)
       OR (rt.task_id = t.id AND rt.related_task_id = ?)
    WHERE t.id != ?
    ORDER BY t.created_at DESC
  `).all(taskId, taskId, taskId) as Task[];
}

export function addRelatedTask(taskId: string, relatedTaskId: string): void {
  // Store in both directions via single canonical row (smaller id first)
  const [a, b] = [taskId, relatedTaskId].sort();
  getDb()
    .prepare('INSERT OR IGNORE INTO related_tasks (task_id, related_task_id) VALUES (?, ?)')
    .run(a, b);
}

export function removeRelatedTask(taskId: string, relatedTaskId: string): void {
  const [a, b] = [taskId, relatedTaskId].sort();
  getDb()
    .prepare('DELETE FROM related_tasks WHERE task_id = ? AND related_task_id = ?')
    .run(a, b);
}

export function getDueReminders(): Task[] {
  const now = new Date().toISOString();
  return getDb()
    .prepare(`SELECT * FROM tasks WHERE reminder_at IS NOT NULL AND reminder_at <= ? AND archived_at IS NULL`)
    .all(now) as Task[];
}

export function clearReminder(taskId: string): void {
  getDb()
    .prepare("UPDATE tasks SET reminder_at = NULL, updated_at = datetime('now') WHERE id = ?")
    .run(taskId);
}

export function getTaskById(id: string): Task | null {
  return (getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task) || null;
}

export function createTask(
  data: Omit<Task, 'id' | 'created_at' | 'updated_at'>
): Task {
  const id = uuidv4();
  getDb()
    .prepare(
      `INSERT INTO tasks (id, title, description, column_id, sort_order, priority, color, source_type, source_info, due_date, recurrence_rule, recurrence_next)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      data.title,
      data.description,
      data.column_id,
      data.sort_order,
      data.priority ?? 0,
      data.color,
      data.source_type ?? 'manual',
      data.source_info,
      data.due_date ?? null,
      (data as Record<string, unknown>).recurrence_rule ?? null,
      (data as Record<string, unknown>).recurrence_next ?? null
    );
  return getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task;
}

export function updateTask(id: string, data: Partial<Task>): Task {
  const allowed = ['title', 'description', 'column_id', 'sort_order', 'priority', 'color', 'source_type', 'source_info', 'due_date', 'reminder_at', 'archived_at', 'is_confidential', 'recurrence_rule', 'recurrence_next', 'time_spent'];
  const filtered = safeFilterFields(data as Record<string, unknown>, allowed);
  const fields = Object.keys(filtered)
    .map((k) => `${k} = ?`)
    .join(', ');
  if (fields) {
    getDb()
      .prepare(`UPDATE tasks SET ${fields}, updated_at = datetime('now') WHERE id = ?`)
      .run(...Object.values(filtered), id);
  }
  return getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task;
}

export function moveTask(id: string, columnId: string, sortOrder: number): void {
  getDb()
    .prepare(`UPDATE tasks SET column_id = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(columnId, sortOrder, id);
}

export function deleteTask(id: string): void {
  getDb().prepare('DELETE FROM tasks WHERE id = ?').run(id);
}

// ─── Attachments ─────────────────────────────────────────────────────────────

export function getAttachmentsByTaskId(taskId: string): Attachment[] {
  return getDb()
    .prepare('SELECT * FROM attachments WHERE task_id = ? ORDER BY created_at')
    .all(taskId) as Attachment[];
}

export function createAttachment(
  data: Omit<Attachment, 'id' | 'created_at'>
): Attachment {
  const id = uuidv4();
  getDb()
    .prepare(
      'INSERT INTO attachments (id, task_id, filename, filepath, filesize, mime_type) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(id, data.task_id, data.filename, data.filepath, data.filesize, data.mime_type);
  return getDb().prepare('SELECT * FROM attachments WHERE id = ?').get(id) as Attachment;
}

export function deleteAttachment(id: string): void {
  getDb().prepare('DELETE FROM attachments WHERE id = ?').run(id);
}

// ─── Notes ───────────────────────────────────────────────────────────────────

export function getAllNotes(): Note[] {
  return getDb().prepare('SELECT * FROM notes ORDER BY created_at DESC').all() as Note[];
}

export function createNote(content: string): Note {
  const id = uuidv4();
  getDb()
    .prepare('INSERT INTO notes (id, content) VALUES (?, ?)')
    .run(id, content);
  return getDb().prepare('SELECT * FROM notes WHERE id = ?').get(id) as Note;
}

export function updateNote(id: string, content: string): Note {
  getDb()
    .prepare("UPDATE notes SET content = ?, updated_at = datetime('now') WHERE id = ?")
    .run(content, id);
  return getDb().prepare('SELECT * FROM notes WHERE id = ?').get(id) as Note;
}

export function deleteNote(id: string): void {
  getDb().prepare('DELETE FROM notes WHERE id = ?').run(id);
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export function getAllTags(): Tag[] {
  return getDb().prepare('SELECT * FROM tags ORDER BY name').all() as Tag[];
}

export function createTag(name: string, color: string): Tag {
  const id = uuidv4();
  getDb()
    .prepare('INSERT INTO tags (id, name, color) VALUES (?, ?, ?)')
    .run(id, name, color);
  return getDb().prepare('SELECT * FROM tags WHERE id = ?').get(id) as Tag;
}

export function deleteTag(id: string): void {
  getDb().prepare('DELETE FROM tags WHERE id = ?').run(id);
}

export function getTagsByTaskId(taskId: string): Tag[] {
  return getDb()
    .prepare(
      `SELECT t.* FROM tags t
       INNER JOIN task_tags tt ON tt.tag_id = t.id
       WHERE tt.task_id = ?
       ORDER BY t.name`
    )
    .all(taskId) as Tag[];
}

export function addTagToTask(taskId: string, tagId: string): void {
  getDb()
    .prepare('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)')
    .run(taskId, tagId);
}

export function removeTagFromTask(taskId: string, tagId: string): void {
  getDb()
    .prepare('DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?')
    .run(taskId, tagId);
}

export function getTasksByColumnId(columnId: string): Task[] {
  return getDb()
    .prepare('SELECT * FROM tasks WHERE column_id = ? ORDER BY sort_order')
    .all(columnId) as Task[];
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function getSetting(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row ? row.value : null;
}

export function setSetting(key: string, value: string): void {
  getDb()
    .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    .run(key, value);
}

export function getAllSettings(): Record<string, string> {
  const rows = getDb().prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

// ─── Task Templates ────────────────────────────────────────────────────────────

export function getAllTemplates(): TaskTemplate[] {
  return getDb()
    .prepare('SELECT * FROM task_templates ORDER BY created_at DESC')
    .all() as TaskTemplate[];
}

export function createTemplate(data: {
  title: string;
  description: string | null;
  priority: number;
  tags: string;
}): TaskTemplate {
  const id = uuidv4();
  getDb()
    .prepare(
      'INSERT INTO task_templates (id, title, description, priority, tags) VALUES (?, ?, ?, ?, ?)'
    )
    .run(id, data.title, data.description, data.priority, data.tags);
  return getDb().prepare('SELECT * FROM task_templates WHERE id = ?').get(id) as TaskTemplate;
}

export function deleteTemplate(id: string): void {
  getDb().prepare('DELETE FROM task_templates WHERE id = ?').run(id);
}

// ─── Focus Sessions ───────────────────────────────────────────────────────────

export interface FocusSession {
  id: string;
  task_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration: number | null; // seconds
  notes: string | null;
}

export function createFocusSession(taskId: string | null): FocusSession {
  const id = uuidv4();
  const started_at = new Date().toISOString();
  getDb()
    .prepare('INSERT INTO focus_sessions (id, task_id, started_at) VALUES (?, ?, ?)')
    .run(id, taskId, started_at);
  return getDb().prepare('SELECT * FROM focus_sessions WHERE id = ?').get(id) as FocusSession;
}

export function endFocusSession(id: string, durationSeconds: number, notes: string | null): FocusSession {
  const ended_at = new Date().toISOString();
  getDb()
    .prepare('UPDATE focus_sessions SET ended_at = ?, duration = ?, notes = ? WHERE id = ?')
    .run(ended_at, durationSeconds, notes, id);
  return getDb().prepare('SELECT * FROM focus_sessions WHERE id = ?').get(id) as FocusSession;
}

export function getFocusSessionsByTask(taskId: string): FocusSession[] {
  return getDb()
    .prepare('SELECT * FROM focus_sessions WHERE task_id = ? ORDER BY started_at DESC')
    .all(taskId) as FocusSession[];
}

export function getTotalFocusTime(taskId: string): number {
  const row = getDb()
    .prepare('SELECT COALESCE(SUM(duration), 0) as total FROM focus_sessions WHERE task_id = ? AND duration IS NOT NULL')
    .get(taskId) as { total: number };
  return row.total;
}

export function addTimeSpent(taskId: string, seconds: number): void {
  getDb()
    .prepare("UPDATE tasks SET time_spent = COALESCE(time_spent, 0) + ?, updated_at = datetime('now') WHERE id = ?")
    .run(seconds, taskId);
}

// ─── Recurring Tasks ──────────────────────────────────────────────────────────

export function getDueRecurringTasks(): Task[] {
  const today = new Date().toISOString().slice(0, 10);
  return getDb()
    .prepare(
      `SELECT * FROM tasks
       WHERE recurrence_rule IS NOT NULL
         AND recurrence_next IS NOT NULL
         AND recurrence_next <= ?
         AND archived_at IS NULL`
    )
    .all(today) as Task[];
}

export function computeNextRecurrence(rule: string, from: Date): Date {
  const next = new Date(from);
  if (rule === 'daily') {
    next.setDate(next.getDate() + 1);
  } else if (rule === 'weekly') {
    next.setDate(next.getDate() + 7);
  } else if (rule === 'monthly') {
    next.setMonth(next.getMonth() + 1);
  } else if (rule === 'weekdays') {
    next.setDate(next.getDate() + 1);
    while (next.getDay() === 0 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1);
    }
  } else if (rule.startsWith('custom:')) {
    const parts = rule.split(':');
    const n = parseInt(parts[1] ?? '1', 10);
    const unit = parts[2] ?? 'day';
    if (unit === 'day') next.setDate(next.getDate() + n);
    else if (unit === 'week') next.setDate(next.getDate() + n * 7);
    else if (unit === 'month') next.setMonth(next.getMonth() + n);
  }
  return next;
}

export function spawnRecurringTask(task: Task): Task {
  const columns = getAllColumns();
  const defaultCol = columns.find((c) => c.is_default === 1) ?? columns[0];
  if (!defaultCol) throw new Error('No columns');

  const tasksInCol = getTasksByColumnId(defaultCol.id);
  const maxOrder = tasksInCol.length > 0
    ? Math.max(...tasksInCol.map((t) => t.sort_order)) + 1
    : 0;

  const newTask = createTask({
    title: task.title,
    description: task.description,
    column_id: defaultCol.id,
    sort_order: maxOrder,
    priority: task.priority,
    color: task.color,
    source_type: 'manual',
    source_info: JSON.stringify({ recurring_from: task.id }),
    due_date: task.recurrence_next ?? null,
    archived_at: null,
    reminder_at: null,
    is_confidential: task.is_confidential ?? 0,
    recurrence_rule: null,
    recurrence_next: null,
  });

  // Update the original task's recurrence_next
  const nextDate = task.recurrence_next
    ? computeNextRecurrence(task.recurrence_rule!, new Date(task.recurrence_next))
    : null;
  getDb()
    .prepare("UPDATE tasks SET recurrence_next = ?, updated_at = datetime('now') WHERE id = ?")
    .run(nextDate ? nextDate.toISOString().slice(0, 10) : null, task.id);

  return newTask;
}

// ─── Export / Import ──────────────────────────────────────────────────────────

export interface ExportData {
  version: number;
  exportedAt: string;
  tasks: unknown[];
  columns: unknown[];
  tags: unknown[];
  task_tags: unknown[];
  notes: unknown[];
  settings: unknown[];
}

export function exportAllData(): ExportData {
  const db = getDb();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    tasks: db.prepare('SELECT * FROM tasks').all(),
    columns: db.prepare('SELECT * FROM columns').all(),
    tags: db.prepare('SELECT * FROM tags').all(),
    task_tags: db.prepare('SELECT * FROM task_tags').all(),
    notes: db.prepare('SELECT * FROM notes').all(),
    settings: db.prepare("SELECT * FROM settings WHERE key NOT IN ('ai_api_key')").all(),
  };
}

export function importAllData(data: ExportData): void {
  const db = getDb();

  db.transaction(() => {
    // Clear existing data
    db.prepare('DELETE FROM task_tags').run();
    db.prepare('DELETE FROM attachments').run();
    db.prepare('DELETE FROM tasks').run();
    db.prepare('DELETE FROM columns').run();
    db.prepare('DELETE FROM tags').run();
    db.prepare('DELETE FROM notes').run();
    db.prepare('DELETE FROM settings').run();

    // Insert columns
    const insertCol = db.prepare(
      'INSERT INTO columns (id, name, color, icon, sort_order, is_default, created_at, updated_at) VALUES (@id, @name, @color, @icon, @sort_order, @is_default, @created_at, @updated_at)'
    );
    for (const col of data.columns as Record<string, unknown>[]) {
      insertCol.run(col);
    }

    // Insert tasks
    const insertTask = db.prepare(
      'INSERT INTO tasks (id, title, description, column_id, sort_order, priority, color, source_type, source_info, due_date, created_at, updated_at) VALUES (@id, @title, @description, @column_id, @sort_order, @priority, @color, @source_type, @source_info, @due_date, @created_at, @updated_at)'
    );
    for (const task of data.tasks as Record<string, unknown>[]) {
      insertTask.run(task);
    }

    // Insert tags
    const insertTag = db.prepare('INSERT INTO tags (id, name, color) VALUES (@id, @name, @color)');
    for (const tag of data.tags as Record<string, unknown>[]) {
      insertTag.run(tag);
    }

    // Insert task_tags
    const insertTaskTag = db.prepare('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (@task_id, @tag_id)');
    for (const tt of data.task_tags as Record<string, unknown>[]) {
      insertTaskTag.run(tt);
    }

    // Insert notes
    const insertNote = db.prepare(
      'INSERT INTO notes (id, content, created_at, updated_at) VALUES (@id, @content, @created_at, @updated_at)'
    );
    for (const note of data.notes as Record<string, unknown>[]) {
      insertNote.run(note);
    }

    // Insert settings
    const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (@key, @value)');
    for (const setting of data.settings as Record<string, unknown>[]) {
      insertSetting.run(setting);
    }
  })();
}

// ─── Board Files ─────────────────────────────────────────────────────────────

export function getBoardFiles(boardId: string): BoardFile[] {
  return getDb()
    .prepare('SELECT * FROM board_files WHERE board_id = ? ORDER BY created_at DESC')
    .all(boardId) as BoardFile[];
}

export function createBoardFile(data: Omit<BoardFile, 'id' | 'created_at'>): BoardFile {
  const id = uuidv4();
  getDb()
    .prepare(
      'INSERT INTO board_files (id, board_id, task_id, filename, filepath, filesize, mime_type) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(id, data.board_id, data.task_id ?? null, data.filename, data.filepath, data.filesize ?? null, data.mime_type ?? null);
  return getDb().prepare('SELECT * FROM board_files WHERE id = ?').get(id) as BoardFile;
}

export function deleteBoardFile(id: string): void {
  getDb().prepare('DELETE FROM board_files WHERE id = ?').run(id);
}

export function attachBoardFileToTask(fileId: string, taskId: string | null): void {
  getDb()
    .prepare('UPDATE board_files SET task_id = ? WHERE id = ?')
    .run(taskId, fileId);
}

// ─── Rules ───────────────────────────────────────────────────────────────────

export function getAllRules(): Rule[] {
  return getDb().prepare('SELECT * FROM rules ORDER BY sort_order, created_at').all() as Rule[];
}

export function createRule(data: Omit<Rule, 'id' | 'created_at'>): Rule {
  const id = uuidv4();
  getDb()
    .prepare(
      'INSERT INTO rules (id, name, enabled, trigger_field, trigger_op, trigger_value, action_type, action_value, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .run(id, data.name, data.enabled, data.trigger_field, data.trigger_op, data.trigger_value, data.action_type, data.action_value, data.sort_order ?? 0);
  return getDb().prepare('SELECT * FROM rules WHERE id = ?').get(id) as Rule;
}

export function updateRule(id: string, data: Partial<Omit<Rule, 'id' | 'created_at'>>): Rule {
  const allowed = ['name', 'enabled', 'trigger_field', 'trigger_op', 'trigger_value', 'action_type', 'action_value', 'sort_order'];
  const filtered = safeFilterFields(data as Record<string, unknown>, allowed);
  const fields = Object.keys(filtered).map((k) => `${k} = ?`).join(', ');
  if (fields) {
    getDb()
      .prepare(`UPDATE rules SET ${fields} WHERE id = ?`)
      .run(...Object.values(filtered), id);
  }
  return getDb().prepare('SELECT * FROM rules WHERE id = ?').get(id) as Rule;
}

export function deleteRule(id: string): void {
  getDb().prepare('DELETE FROM rules WHERE id = ?').run(id);
}
