import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';

function getStorageDir(): string {
  const dir = path.join(app.getPath('userData'), 'storage');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/** Copies a file to userData/storage and returns the destination path. */
export function copyToStorage(filePath: string): string {
  const storageDir = getStorageDir();
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  const dest = path.join(storageDir, `${uuidv4()}-${base}${ext}`);
  fs.copyFileSync(filePath, dest);
  return dest;
}

/** Saves a Buffer as a file in userData/storage and returns the destination path. */
export function saveBufferToStorage(filename: string, content: Buffer): string {
  const storageDir = getStorageDir();
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  const dest = path.join(storageDir, `${uuidv4()}-${base}${ext}`);
  fs.writeFileSync(dest, content);
  return dest;
}
