import { getDb } from './database';
import { v4 as uuidv4 } from 'uuid';
import type { Task, Column, Attachment } from '../../shared/types';

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
  const filtered = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
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
  return getDb().prepare('SELECT * FROM tasks ORDER BY column_id, sort_order').all() as Task[];
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
      `INSERT INTO tasks (id, title, description, column_id, sort_order, priority, color, source_type, source_info)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
      data.source_info
    );
  return getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task;
}

export function updateTask(id: string, data: Partial<Task>): Task {
  const allowed = ['title', 'description', 'column_id', 'sort_order', 'priority', 'color', 'source_type', 'source_info'];
  const filtered = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
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
