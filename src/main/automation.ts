import { BrowserWindow } from 'electron';
import * as queries from './db/queries';

/**
 * Automation rules engine.
 * Runs on startup + every 5 minutes.
 */
export function runAutomation(mainWindow: BrowserWindow | null) {
  try {
    runAutoArchive(mainWindow);
    runOverdueReminders(mainWindow);
    runStaleHighPriorityReminders(mainWindow);
  } catch (err) {
    // Don't crash the app for automation failures
    console.error('[automation] error:', err);
  }
}

function sendToast(mainWindow: BrowserWindow | null, message: string) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('automation:toast', message);
  }
}

/** Rule 1: Auto-archive tasks in "done" columns older than N days */
function runAutoArchive(mainWindow: BrowserWindow | null) {
  const enabled = queries.getSetting('automation_autoArchive') ?? 'true';
  if (enabled !== 'true') return;

  const days = parseInt(queries.getSetting('automation_autoArchiveDays') ?? '7', 10);
  const columns = queries.getAllColumns();

  // Find columns by type (preferred) or fallback to name pattern
  const doneColumns = columns.filter((c) =>
    c.column_type === 'done' || c.column_type === 'cancelled' ||
    /готово|done|complete|забито|cancel|discard/i.test(c.name)
  );
  if (doneColumns.length === 0) return;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffStr = cutoffDate.toISOString();

  for (const col of doneColumns) {
    const tasks = queries.getTasksByColumnId(col.id);
    let archivedCount = 0;
    for (const task of tasks) {
      if (task.archived_at) continue;
      if (task.updated_at < cutoffStr) {
        queries.archiveTask(task.id);
        archivedCount++;
      }
    }
    if (archivedCount > 0) {
      sendToast(mainWindow, `Автоархивация: ${archivedCount} задач из "${col.name}"`);
    }
  }
}

/** Rule 2: Notify about overdue tasks (toast only, no recurring reminders) */
function runOverdueReminders(mainWindow: BrowserWindow | null) {
  const enabled = queries.getSetting('automation_overdueReminders') ?? 'true';
  if (enabled !== 'true') return;

  const now = new Date().toISOString();
  const tasks = queries.getAllTasks();

  let count = 0;
  for (const task of tasks) {
    if (!task.due_date) continue;
    if (task.due_date >= now) continue; // not overdue
    if (task.archived_at) continue;
    count++;
  }

  if (count > 0) {
    sendToast(mainWindow, `Просрочено задач: ${count}`);
  }
}

/** Rule 3: Remind about high-priority tasks stuck in "inbox" column for 3+ days */
function runStaleHighPriorityReminders(mainWindow: BrowserWindow | null) {
  const enabled = queries.getSetting('automation_staleHighPriority') ?? 'true';
  if (enabled !== 'true') return;

  const columns = queries.getAllColumns();
  const inboxCol = columns.find((c) => /новые|inbox|new/i.test(c.name));
  if (!inboxCol) return;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 3);
  const cutoffStr = cutoff.toISOString();

  const tasks = queries.getTasksByColumnId(inboxCol.id);
  const stale = tasks.filter(
    (t) => t.priority === 3 && !t.archived_at && t.created_at < cutoffStr
  );

  if (stale.length > 0) {
    sendToast(
      mainWindow,
      `${stale.length} важных задач залежались в "${inboxCol.name}" более 3 дней`
    );
  }
}
