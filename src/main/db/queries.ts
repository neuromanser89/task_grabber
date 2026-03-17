import { getDb } from './database';
import { v4 as uuidv4 } from 'uuid';
import type { Task, Column, Attachment, Note, Tag } from '../../shared/types';

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
  const allowed = ['title', 'description', 'column_id', 'sort_order', 'priority', 'color', 'source_type', 'source_info', 'due_date'];
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
