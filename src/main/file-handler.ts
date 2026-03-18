import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { randomUUID as uuidv4 } from 'crypto';

function getStorageDir(): string {
  const dir = path.join(app.getPath('userData'), 'storage');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/** Sanitize filename: strip path separators, dots-only names, null bytes */
function sanitizeFilename(name: string): string {
  return path.basename(name).replace(/[\x00-\x1f]/g, '').replace(/^\.+$/, 'file') || 'file';
}

/** Copies a file to userData/storage and returns the destination path. */
export function copyToStorage(filePath: string): string {
  const storageDir = getStorageDir();
  const safeName = sanitizeFilename(path.basename(filePath));
  const ext = path.extname(safeName);
  const base = path.basename(safeName, ext);
  const dest = path.join(storageDir, `${uuidv4()}-${base}${ext}`);
  fs.copyFileSync(filePath, dest);
  return dest;
}

/** Saves a Buffer as a file in userData/storage and returns the destination path. */
export function saveBufferToStorage(filename: string, content: Buffer): string {
  const storageDir = getStorageDir();
  const safeName = sanitizeFilename(filename);
  const ext = path.extname(safeName);
  const base = path.basename(safeName, ext);
  const dest = path.join(storageDir, `${uuidv4()}-${base}${ext}`);
  fs.writeFileSync(dest, content);
  return dest;
}
