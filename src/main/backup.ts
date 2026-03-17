import path from 'path';
import fs from 'fs';
import { app } from 'electron';

const MAX_BACKUPS = 5;

export function getBackupDir(): string {
  return path.join(app.getPath('userData'), 'backups');
}

export function getDbPath(): string {
  return path.join(app.getPath('userData'), 'tasks.db');
}

export function createBackup(): string | null {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) return null;

  const backupDir = getBackupDir();
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupName = `tasks_backup_${dateStr}.db`;
  const backupPath = path.join(backupDir, backupName);

  fs.copyFileSync(dbPath, backupPath);

  // Keep only last MAX_BACKUPS
  pruneBackups();

  return backupPath;
}

export function listBackups(): { name: string; path: string; date: string; size: number }[] {
  const backupDir = getBackupDir();
  if (!fs.existsSync(backupDir)) return [];

  const files = fs.readdirSync(backupDir)
    .filter((f) => f.startsWith('tasks_backup_') && f.endsWith('.db'))
    .sort()
    .reverse(); // newest first

  return files.map((name) => {
    const filePath = path.join(backupDir, name);
    const stat = fs.statSync(filePath);
    // Parse date from filename: tasks_backup_YYYY-MM-DDTHH-MM-SS.db
    const datePart = name.replace('tasks_backup_', '').replace('.db', '');
    const isoDate = datePart.replace(/T/, 'T').replace(/-(\d{2})-(\d{2})$/, ':$1:$2');
    return {
      name,
      path: filePath,
      date: isoDate,
      size: stat.size,
    };
  });
}

export function restoreBackup(backupPath: string): void {
  const backupDir = getBackupDir();
  // Security: only allow restoring from our backup dir
  const resolved = path.resolve(backupPath);
  const resolvedBackupDir = path.resolve(backupDir);
  if (!resolved.startsWith(resolvedBackupDir)) {
    throw new Error('Access denied: invalid backup path');
  }
  if (!fs.existsSync(resolved)) {
    throw new Error('Backup file not found');
  }
  const dbPath = getDbPath();
  // Copy backup over current DB — DB must be closed first (handled in ipc-handlers)
  fs.copyFileSync(resolved, dbPath);
}

function pruneBackups(): void {
  const backupDir = getBackupDir();
  const files = fs.readdirSync(backupDir)
    .filter((f) => f.startsWith('tasks_backup_') && f.endsWith('.db'))
    .sort(); // oldest first

  while (files.length > MAX_BACKUPS) {
    const oldest = files.shift()!;
    fs.unlinkSync(path.join(backupDir, oldest));
  }
}
