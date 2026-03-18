export type Priority = 0 | 1 | 2 | 3; // none, low, medium, high
export type SourceType = 'manual' | 'text' | 'file' | 'email';
export type RecurrenceRule = 'daily' | 'weekly' | 'monthly' | 'weekdays' | string; // 'custom:N:day|week|month'

export interface Column {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  sort_order: number;
  is_default: number;
  wip_limit?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  column_id: string;
  sort_order: number;
  priority: Priority;
  color: string | null;
  source_type: SourceType;
  source_info: string | null;
  due_date: string | null;
  archived_at: string | null;
  reminder_at: string | null;
  is_confidential?: number; // 0 or 1
  recurrence_rule?: RecurrenceRule | null;
  recurrence_next?: string | null; // ISO date when next instance should be created
  time_spent?: number; // seconds of focus time accumulated
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: string;
  task_id: string;
  filename: string;
  filepath: string;
  filesize: number | null;
  mime_type: string | null;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface TaskTag {
  task_id: string;
  tag_id: string;
}

export interface TaskWithAttachments extends Task {
  attachments: Attachment[];
  tags: Tag[];
}

export interface TaskTemplate {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  tags: string; // JSON array of tag names
  created_at: string;
}

// IPC channel names
export const IPC = {
  TASKS_GET_ALL: 'tasks:getAll',
  TASKS_CREATE: 'tasks:create',
  TASKS_UPDATE: 'tasks:update',
  TASKS_DELETE: 'tasks:delete',
  TASKS_MOVE: 'tasks:move',
  COLUMNS_GET_ALL: 'columns:getAll',
  COLUMNS_CREATE: 'columns:create',
  COLUMNS_UPDATE: 'columns:update',
  COLUMNS_DELETE: 'columns:delete',
  ATTACHMENTS_ADD: 'attachments:add',
  ATTACHMENTS_DELETE: 'attachments:delete',
  OPEN_FILE: 'file:open',
  SHOW_WINDOW: 'window:show',
  HIDE_WINDOW: 'window:hide',
  MINIMIZE_WINDOW: 'window:minimize',
  MAXIMIZE_WINDOW: 'window:maximize',
  CLOSE_WINDOW: 'window:close',
  NOTES_GET_ALL: 'notes:getAll',
  NOTES_CREATE: 'notes:create',
  NOTES_UPDATE: 'notes:update',
  NOTES_DELETE: 'notes:delete',
  TEMPLATES_GET_ALL: 'templates:getAll',
  TEMPLATES_CREATE: 'templates:create',
  TEMPLATES_DELETE: 'templates:delete',
  TASKS_ARCHIVE: 'tasks:archive',
  TASKS_UNARCHIVE: 'tasks:unarchive',
  TASKS_GET_ARCHIVED: 'tasks:getArchived',
  TASKS_GET_STATS: 'tasks:getStats',
  RELATED_ADD: 'related:add',
  RELATED_REMOVE: 'related:remove',
  RELATED_GET: 'related:get',
} as const;

export interface TaskStats {
  total: number;
  byColumn: { column_id: string; column_name: string; count: number }[];
  createdToday: number;
  createdThisWeek: number;
  completedTotal: number;
  archivedTotal: number;
  byPriority: { priority: number; count: number }[];
}
