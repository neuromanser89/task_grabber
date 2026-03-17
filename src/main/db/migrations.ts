import Database from 'better-sqlite3';
import { DEFAULT_COLUMNS } from '../../shared/constants';
import { randomUUID as uuidv4 } from 'crypto';

export function runMigrations(db: Database.Database) {
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
  `);

  // Migrate: add due_date column if missing (for existing DBs)
  const taskColumns = db.prepare("PRAGMA table_info(tasks)").all() as { name: string }[];
  if (!taskColumns.find((c) => c.name === 'due_date')) {
    db.exec("ALTER TABLE tasks ADD COLUMN due_date TEXT");
  }

  // Seed default columns if empty
  const count = db.prepare('SELECT COUNT(*) as cnt FROM columns').get() as { cnt: number };
  if (count.cnt === 0) {
    const insert = db.prepare(
      'INSERT INTO columns (id, name, color, icon, sort_order, is_default) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const insertMany = db.transaction(() => {
      for (const col of DEFAULT_COLUMNS) {
        insert.run(uuidv4(), col.name, col.color, col.icon, col.sort_order, col.is_default);
      }
    });
    insertMany();
  }
}
