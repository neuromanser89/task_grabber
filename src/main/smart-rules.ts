import { BrowserWindow, Notification } from 'electron';
import * as queries from './db/queries';
import type { Task, Rule } from '../shared/types';

/**
 * Smart Rules Engine — runs on demand and every 5 minutes via automation.
 * Evaluates all enabled rules against active tasks and applies actions.
 */
export function runSmartRules(mainWindow: BrowserWindow | null): number {
  let actionsApplied = 0;
  try {
    const rules = queries.getAllRules().filter((r) => r.enabled === 1);
    if (rules.length === 0) return 0;

    const tasks = queries.getAllTasks();
    const columns = queries.getAllColumns();
    const tags = queries.getAllTags();

    // Batch load all task-tag relations to avoid N+1 queries
    const tagsByTask = new Map<string, { id: string; name: string; color: string }[]>();
    for (const task of tasks) {
      tagsByTask.set(task.id, queries.getTagsByTaskId(task.id));
    }

    for (const task of tasks) {
      const taskTags = tagsByTask.get(task.id) ?? [];

      for (const rule of rules) {
        if (!matchesRule(task, rule, taskTags, columns)) continue;

        const applied = applyAction(task, rule, columns, tags, taskTags, mainWindow);
        if (applied) actionsApplied++;
      }
    }

    if (actionsApplied > 0 && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('automation:toast', `Правила: выполнено ${actionsApplied} действий`);
      mainWindow.webContents.send('tasks:refresh');
    }
  } catch (err) {
    console.error('[smart-rules] error:', err);
  }
  return actionsApplied;
}

// ── Condition matching ────────────────────────────────────────────────────────

function matchesRule(
  task: Task,
  rule: Rule,
  taskTags: { id: string; name: string; color: string }[],
  columns: { id: string; name: string }[]
): boolean {
  if (task.archived_at) return false; // never touch archived tasks

  const { trigger_field, trigger_op, trigger_value } = rule;

  switch (trigger_field) {
    case 'priority': {
      const v = parseInt(trigger_value, 10);
      const p = task.priority ?? 0;
      if (trigger_op === 'equals') return p === v;
      if (trigger_op === 'not_equals') return p !== v;
      if (trigger_op === 'greater_than') return p > v;
      if (trigger_op === 'less_than') return p < v;
      return false;
    }
    case 'column_id': {
      if (trigger_op === 'equals') return task.column_id === trigger_value;
      if (trigger_op === 'not_equals') return task.column_id !== trigger_value;
      return false;
    }
    case 'due_date': {
      if (trigger_op === 'overdue') {
        if (!task.due_date) return false;
        return new Date(task.due_date) < new Date();
      }
      return false;
    }
    case 'tag': {
      const hasTag = taskTags.some((t) => t.id === trigger_value);
      if (trigger_op === 'equals') return hasTag;
      if (trigger_op === 'not_equals') return !hasTag;
      return false;
    }
    case 'title': {
      const title = (task.title ?? '').toLowerCase();
      const val = trigger_value.toLowerCase();
      if (trigger_op === 'contains') return title.includes(val);
      if (trigger_op === 'equals') return title === val;
      if (trigger_op === 'not_equals') return title !== val;
      return false;
    }
    case 'source_type': {
      if (trigger_op === 'equals') return task.source_type === trigger_value;
      if (trigger_op === 'not_equals') return task.source_type !== trigger_value;
      return false;
    }
    case 'in_column_days': {
      // Задача в текущей колонке более N дней (по updated_at)
      const days = parseInt(trigger_value, 10);
      if (isNaN(days)) return false;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      return new Date(task.updated_at) < cutoff;
    }
    case 'no_activity_days': {
      // Нет активности (updated_at) более N дней
      const days = parseInt(trigger_value, 10);
      if (isNaN(days)) return false;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      return new Date(task.updated_at) < cutoff;
    }
    default:
      return false;
  }
}

// ── Action application ────────────────────────────────────────────────────────

function applyAction(
  task: Task,
  rule: Rule,
  columns: { id: string; name: string }[],
  tags: { id: string; name: string; color: string }[],
  taskTags: { id: string; name: string; color: string }[],
  mainWindow: BrowserWindow | null
): boolean {
  switch (rule.action_type) {
    case 'move_to_column': {
      if (task.column_id === rule.action_value) return false;
      const colTasks = queries.getTasksByColumnId(rule.action_value);
      const maxOrder = colTasks.length > 0 ? Math.max(...colTasks.map((t) => t.sort_order)) + 1 : 0;
      queries.moveTask(task.id, rule.action_value, maxOrder);
      return true;
    }
    case 'set_priority': {
      const newPriority = parseInt(rule.action_value, 10) as Task['priority'];
      if (task.priority === newPriority) return false;
      queries.updateTask(task.id, { priority: newPriority });
      return true;
    }
    case 'add_tag': {
      const tag = tags.find((t) => t.id === rule.action_value);
      if (!tag) return false;
      if (taskTags.some((t) => t.id === tag.id)) return false;
      queries.addTagToTask(task.id, tag.id);
      return true;
    }
    case 'archive': {
      queries.archiveTask(task.id);
      return true;
    }
    case 'set_color': {
      if (task.color === rule.action_value) return false;
      queries.updateTask(task.id, { color: rule.action_value });
      return true;
    }
    case 'notify': {
      const colName = columns.find((c) => c.id === task.column_id)?.name ?? '';
      const message = rule.action_value || `Правило "${rule.name}": ${task.title}`;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('automation:toast', message);
      }
      // Also show OS notification
      try {
        const notif = new Notification({
          title: 'Task Grabber — Правило',
          body: `${message}\n${task.title}`,
          silent: true,
        });
        notif.on('click', () => {
          mainWindow?.show();
          mainWindow?.webContents.send('reminder:show', task.id);
        });
        notif.show();
      } catch { /* notification might not be available */ }
      return true;
    }
    default:
      return false;
  }
}
