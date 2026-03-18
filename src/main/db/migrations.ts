import Database from 'better-sqlite3';
import { DEFAULT_COLUMNS } from '../../shared/constants';
import { randomUUID as uuidv4 } from 'crypto';

export function runMigrations(db: Database.Database) {
  // Boards table (must exist before columns)
  db.exec(`
    CREATE TABLE IF NOT EXISTS boards (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      color      TEXT NOT NULL DEFAULT '#3B82F6',
      icon       TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS columns (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      color       TEXT NOT NULL,
      icon        TEXT,
      sort_order  INTEGER NOT NULL,
      is_default  INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id           TEXT PRIMARY KEY,
      title        TEXT NOT NULL,
      description  TEXT,
      column_id    TEXT NOT NULL REFERENCES columns(id),
      sort_order   INTEGER NOT NULL,
      priority     INTEGER DEFAULT 0,
      color        TEXT,
      source_type  TEXT DEFAULT 'manual',
      source_info  TEXT,
      due_date     TEXT,
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id           TEXT PRIMARY KEY,
      task_id      TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      filename     TEXT NOT NULL,
      filepath     TEXT NOT NULL,
      filesize     INTEGER,
      mime_type    TEXT,
      created_at   TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tags (
      id    TEXT PRIMARY KEY,
      name  TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_tags (
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      tag_id  TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS notes (
      id         TEXT PRIMARY KEY,
      content    TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_templates (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      description TEXT,
      priority    INTEGER DEFAULT 0,
      tags        TEXT DEFAULT '[]',
      created_at  TEXT DEFAULT (datetime('now'))
    );
  `);

  // Smart Rules table
  db.exec(`
    CREATE TABLE IF NOT EXISTS rules (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      enabled       INTEGER DEFAULT 1,
      trigger_field TEXT NOT NULL,
      trigger_op    TEXT NOT NULL,
      trigger_value TEXT NOT NULL,
      action_type   TEXT NOT NULL,
      action_value  TEXT NOT NULL,
      sort_order    INTEGER DEFAULT 0,
      created_at    TEXT DEFAULT (datetime('now'))
    );
  `);

  // Migrate: add related_tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS related_tasks (
      task_id         TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      related_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, related_task_id)
    );
  `);

  // Migrate: add focus_sessions table (time tracking)
  db.exec(`
    CREATE TABLE IF NOT EXISTS focus_sessions (
      id         TEXT PRIMARY KEY,
      task_id    TEXT REFERENCES tasks(id) ON DELETE SET NULL,
      started_at TEXT NOT NULL,
      ended_at   TEXT,
      duration   INTEGER,
      notes      TEXT
    );
  `);

  // Migrate: add board_id to columns table
  const colMetaInit = db.prepare("PRAGMA table_info(columns)").all() as { name: string }[];
  if (!colMetaInit.find((c) => c.name === 'board_id')) {
    db.exec("ALTER TABLE columns ADD COLUMN board_id TEXT");
  }

  // Migrate: add wip_limit to columns table
  const colMeta = db.prepare("PRAGMA table_info(columns)").all() as { name: string }[];
  if (!colMeta.find((c) => c.name === 'wip_limit')) {
    db.exec("ALTER TABLE columns ADD COLUMN wip_limit INTEGER");
  }

  // Migrate: add missing columns (for existing DBs)
  const taskColumns = db.prepare("PRAGMA table_info(tasks)").all() as { name: string }[];
  if (!taskColumns.find((c) => c.name === 'due_date')) {
    db.exec("ALTER TABLE tasks ADD COLUMN due_date TEXT");
  }
  if (!taskColumns.find((c) => c.name === 'archived_at')) {
    db.exec("ALTER TABLE tasks ADD COLUMN archived_at TEXT");
  }
  if (!taskColumns.find((c) => c.name === 'reminder_at')) {
    db.exec("ALTER TABLE tasks ADD COLUMN reminder_at TEXT");
  }
  if (!taskColumns.find((c) => c.name === 'is_confidential')) {
    db.exec("ALTER TABLE tasks ADD COLUMN is_confidential INTEGER DEFAULT 0");
  }
  if (!taskColumns.find((c) => c.name === 'recurrence_rule')) {
    db.exec("ALTER TABLE tasks ADD COLUMN recurrence_rule TEXT");
  }
  if (!taskColumns.find((c) => c.name === 'recurrence_next')) {
    db.exec("ALTER TABLE tasks ADD COLUMN recurrence_next TEXT");
  }
  if (!taskColumns.find((c) => c.name === 'time_spent')) {
    db.exec("ALTER TABLE tasks ADD COLUMN time_spent INTEGER DEFAULT 0");
  }

  // Migrate: add title column to notes
  const notesCols = db.prepare("PRAGMA table_info(notes)").all() as { name: string }[];
  if (!notesCols.find((c) => c.name === 'title')) {
    db.exec("ALTER TABLE notes ADD COLUMN title TEXT");
  }

  // Migrate: add board_files table
  db.exec(`
    CREATE TABLE IF NOT EXISTS board_files (
      id        TEXT PRIMARY KEY,
      board_id  TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      task_id   TEXT REFERENCES tasks(id) ON DELETE SET NULL,
      filename  TEXT NOT NULL,
      filepath  TEXT NOT NULL,
      filesize  INTEGER,
      mime_type TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed default board if empty, then seed columns with board_id
  const boardCount = db.prepare('SELECT COUNT(*) as cnt FROM boards').get() as { cnt: number };
  let defaultBoardId: string;
  if (boardCount.cnt === 0) {
    defaultBoardId = uuidv4();
    db.prepare('INSERT INTO boards (id, name, color, icon, sort_order) VALUES (?, ?, ?, ?, ?)')
      .run(defaultBoardId, 'Основная', '#3B82F6', 'layout-dashboard', 0);
  } else {
    const firstBoard = db.prepare('SELECT id FROM boards ORDER BY sort_order LIMIT 1').get() as { id: string };
    defaultBoardId = firstBoard.id;
  }

  // Seed default columns if empty
  const count = db.prepare('SELECT COUNT(*) as cnt FROM columns').get() as { cnt: number };
  if (count.cnt === 0) {
    const insert = db.prepare(
      'INSERT INTO columns (id, name, color, icon, sort_order, is_default, board_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const insertMany = db.transaction(() => {
      for (const col of DEFAULT_COLUMNS) {
        insert.run(uuidv4(), col.name, col.color, col.icon, col.sort_order, col.is_default, defaultBoardId);
      }
    });
    insertMany();
  } else {
    // Assign board_id to existing columns that have NULL board_id
    db.prepare("UPDATE columns SET board_id = ? WHERE board_id IS NULL").run(defaultBoardId);
  }

  // Seed default settings if empty
  const settingsCount = db.prepare('SELECT COUNT(*) as cnt FROM settings').get() as { cnt: number };
  if (settingsCount.cnt === 0) {
    const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    const defaultHotkeys = JSON.stringify({
      GRAB_TEXT: 'CommandOrControl+Shift+T',
      GRAB_FILES: 'CommandOrControl+Shift+F',
      QUICK_NOTE: 'CommandOrControl+Shift+N',
    });
    db.transaction(() => {
      insertSetting.run('autoLaunch', 'false');
      insertSetting.run('theme', 'dark');
      insertSetting.run('hotkeys', defaultHotkeys);
      insertSetting.run('automation_autoArchive', 'true');
      insertSetting.run('automation_autoArchiveDays', '7');
      insertSetting.run('automation_overdueReminders', 'true');
      insertSetting.run('automation_staleHighPriority', 'true');
    })();
  }
}
