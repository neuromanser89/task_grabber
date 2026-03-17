export type Priority = 0 | 1 | 2 | 3; // none, low, medium, high
export type SourceType = 'manual' | 'text' | 'file' | 'email';

export interface Column {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  sort_order: number;
  is_default: number;
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
} as const;
