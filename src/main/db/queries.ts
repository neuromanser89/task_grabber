import { getDb } from './database';
import { randomUUID as uuidv4 } from 'crypto';
import type { Task, Column, Attachment, Note, Tag, TaskTemplate, TaskStats } from '../../shared/types';

const SAFE_FIELD_RE = /^[a-z_]+$/;

function safeFilterFields(data: Record<string, unknown>, allowed: string[]): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).filter(([k]) => allowed.includes(k) && SAFE_FIELD_RE.test(k))
  );
}

// ─── Columns ────────────────────────────────────────────────────────────────

export function getAllColumns(): Column[] {
  return getDb().prepare('SELECT * FROM columns ORDER BY sort_order').all() as Column[];
}

export function createColumn(data: Omit<Column, 'id' | 'created_at' | 'updated_at'>): Column {
  const id = uuidv4();
  getDb()
    .prepare(
      'INSERT INTO columns (id, name, color, icon, sort_order, is_default) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(id, data.name, data.color, data.icon, data.sort_order, data.is_default);
  return getDb().prepare('SELECT * FROM columns WHERE id = ?').get(id) as Column;
}

export function updateColumn(id: string, data: Partial<Column>): Column {
  const allowed = ['name', 'color', 'icon', 'sort_order', 'is_default'];
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
      `INSERT INTO tasks (id, title, description, column_id, sort_order, priority, color, source_type, source_info, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
      data.due_date ?? null
    );
  return getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task;
}

export function updateTask(id: string, data: Partial<Task>): Task {
  const allowed = ['title', 'description', 'column_id', 'sort_order', 'priority', 'color', 'source_type', 'source_info', 'due_date', 'reminder_at', 'archived_at'];
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
