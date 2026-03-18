export interface Board {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type Priority = 0 | 1 | 2 | 3; // none, low, medium, high
export type SourceType = 'manual' | 'text' | 'file' | 'email';
export type RecurrenceRule = 'daily' | 'weekly' | 'monthly' | 'weekdays' | (string & {}); // 'custom:N:day|week|month'

export interface Column {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  sort_order: number;
  is_default: number;
  wip_limit?: number | null;
  board_id?: string | null;
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
  title: string | null;
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

// Smart Rules
export type RuleTriggerField = 'priority' | 'column_id' | 'due_date' | 'tag' | 'title' | 'source_type' | 'in_column_days' | 'no_activity_days';
export type RuleTriggerOp = 'equals' | 'not_equals' | 'contains' | 'overdue' | 'greater_than' | 'less_than' | 'more_than_days';
export type RuleActionType = 'move_to_column' | 'set_priority' | 'add_tag' | 'archive' | 'set_color' | 'notify';

export interface Rule {
  id: string;
  name: string;
  enabled: number; // 0 or 1
  trigger_field: RuleTriggerField;
  trigger_op: RuleTriggerOp;
  trigger_value: string;
  action_type: RuleActionType;
  action_value: string;
  sort_order: number;
  created_at: string;
}

export interface TaskStats {
  total: number;
  byColumn: { column_id: string; column_name: string; count: number }[];
  createdToday: number;
  createdThisWeek: number;
  completedTotal: number;
  archivedTotal: number;
  byPriority: { priority: number; count: number }[];
}

export interface BoardFile {
  id: string;
  board_id: string;
  task_id: string | null; // null = загружен напрямую
  filename: string;
  filepath: string;
  filesize: number | null;
  mime_type: string | null;
  created_at: string;
}
