import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Search, Trash2, Paperclip, FolderOpen, File, X } from 'lucide-react';
import { useBoardStore } from '../../stores/boardStore';
import { useTaskStore } from '../../stores/taskStore';
import type { BoardFile } from '@shared/types';

function formatSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'word';
  if (['xls', 'xlsx'].includes(ext)) return 'excel';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) return 'audio';
  return 'file';
}

function FileIcon({ filename }: { filename: string }) {
  const type = getFileIcon(filename);
  const colors: Record<string, string> = {
    image: 'text-accent-green',
    pdf: 'text-red-400',
    word: 'text-blue-400',
    excel: 'text-emerald-400',
    archive: 'text-amber-400',
    video: 'text-purple-400',
    audio: 'text-pink-400',
    file: 'text-t-40',
  };
  return <File size={18} className={colors[type] ?? 'text-t-40'} />;
}

interface ContextMenu {
  x: number;
  y: number;
  file: BoardFile;
}

export default function BoardFilesView() {
  const { activeBoardId } = useBoardStore();
  const { tasks } = useTaskStore();
  const [files, setFiles] = useState<BoardFile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [attachingFileId, setAttachingFileId] = useState<string | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!activeBoardId) return;
    setLoading(true);
    try {
      const result = (await window.electronAPI?.boardFilesGetAll(activeBoardId)) ?? [];
      setFiles(result as BoardFile[]);
    } finally {
      setLoading(false);
    }
  }, [activeBoardId]);

  useEffect(() => {
    load();
  }, [load]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [contextMenu]);

  const addFiles = useCallback(async (filePaths: string[]) => {
    if (!activeBoardId) return;
    for (const fp of filePaths) {
      try {
        await window.electronAPI?.boardFilesAdd(activeBoardId, fp, null);
      } catch (e) {
        console.error('boardFilesAdd error', e);
      }
    }
    load();
  }, [activeBoardId, load]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const paths: string[] = [];
    for (const file of Array.from(e.dataTransfer.files)) {
      const p = window.electronAPI?.getFilePath(file);
      if (p) paths.push(p);
    }
    if (paths.length > 0) await addFiles(paths);
  }, [addFiles]);

  const handlePickFiles = useCallback(async () => {
    const paths = (await window.electronAPI?.boardFilesOpenDialog()) ?? [];
    if (paths.length > 0) await addFiles(paths as string[]);
  }, [addFiles]);

  const handleDelete = useCallback(async (id: string) => {
    await window.electronAPI?.boardFilesDelete(id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleOpen = useCallback(async (filepath: string) => {
    try {
      await window.electronAPI?.openFile(filepath);
    } catch {
      // ignore
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, file: BoardFile) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  }, []);

  const handleAttachToTask = useCallback(async (fileId: string, taskId: string | null) => {
    await window.electronAPI?.boardFilesAttachToTask(fileId, taskId);
    setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, task_id: taskId } : f));
    setContextMenu(null);
    setAttachingFileId(null);
  }, []);

  const filtered = files.filter((f) =>
    !search || f.filename.toLowerCase().includes(search.toLowerCase())
  );

  const boardTasks = tasks.filter((t) => !t.archived_at);

  if (!activeBoardId) {
    return (
      <div className="flex-1 flex items-center justify-center text-t-40">
        Выберите доску
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0 bg-t-06 rounded-lg px-3 h-8">
          <Search size={13} className="text-t-40 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени файла..."
            className="flex-1 bg-transparent text-sm text-t-primary placeholder:text-t-40 outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-t-40 hover:text-t-70">
              <X size={12} />
            </button>
          )}
        </div>
        <button
          onClick={handlePickFiles}
          className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium bg-accent-blue/80 hover:bg-accent-blue text-white rounded-lg transition-colors"
        >
          <Upload size={13} />
          Загрузить
        </button>
      </div>

      {/* Drop zone */}
      <div
        ref={dropZoneRef}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer flex-shrink-0
          ${dragging
            ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
            : 'border-t-12 hover:border-t-20 text-t-40 hover:text-t-60'
          }`}
        onClick={handlePickFiles}
      >
        <FolderOpen size={28} className="mx-auto mb-2 opacity-60" />
        <p className="text-sm font-medium">Перетащите файлы сюда или нажмите для выбора</p>
        <p className="text-xs mt-1 opacity-60">Все вложения текущей доски</p>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="text-t-40 text-sm text-center py-8">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="text-t-40 text-sm text-center py-8">
            {search ? 'Ничего не найдено' : 'Файлов нет. Загрузите первый!'}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1.5">
            {filtered.map((file) => {
              const linkedTask = file.task_id ? tasks.find((t) => t.id === file.task_id) : null;
              return (
                <div
                  key={file.id}
                  onContextMenu={(e) => handleContextMenu(e, file)}
                  onDoubleClick={() => handleOpen(file.filepath)}
                  className="group flex items-center gap-3 px-3 py-2.5 rounded-lg bg-t-04 hover:bg-t-08 cursor-pointer transition-colors select-none"
                >
                  <FileIcon filename={file.filename} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-t-primary truncate">{file.filename}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-t-40">{formatSize(file.filesize)}</span>
                      {linkedTask && (
                        <span className="text-xs text-accent-blue/70 flex items-center gap-1">
                          <Paperclip size={10} />
                          {linkedTask.title.slice(0, 30)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-500/20 text-t-40 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-glass-dark border border-t-12 rounded-lg shadow-xl py-1 min-w-44"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-3 py-2 text-sm text-t-primary hover:bg-t-08 flex items-center gap-2"
            onClick={() => { handleOpen(contextMenu.file.filepath); setContextMenu(null); }}
          >
            <FolderOpen size={13} className="text-t-40" />
            Открыть
          </button>
          {attachingFileId === contextMenu.file.id ? (
            <div className="max-h-48 overflow-y-auto">
              <div className="px-3 py-1.5 text-xs text-t-40 font-medium uppercase tracking-wide">Привязать к задаче</div>
              {contextMenu.file.task_id && (
                <button
                  className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-t-08"
                  onClick={() => handleAttachToTask(contextMenu.file.id, null)}
                >
                  Отвязать
                </button>
              )}
              {boardTasks.map((t) => (
                <button
                  key={t.id}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-t-08 truncate
                    ${t.id === contextMenu.file.task_id ? 'text-accent-blue' : 'text-t-primary'}`}
                  onClick={() => handleAttachToTask(contextMenu.file.id, t.id)}
                >
                  {t.title}
                </button>
              ))}
            </div>
          ) : (
            <button
              className="w-full text-left px-3 py-2 text-sm text-t-primary hover:bg-t-08 flex items-center gap-2"
              onClick={() => setAttachingFileId(contextMenu.file.id)}
            >
              <Paperclip size={13} className="text-t-40" />
              Привязать к задаче
            </button>
          )}
          <div className="h-px bg-t-08 my-1" />
          <button
            className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-t-08 flex items-center gap-2"
            onClick={() => { handleDelete(contextMenu.file.id); setContextMenu(null); }}
          >
            <Trash2 size={13} />
            Удалить
          </button>
        </div>
      )}
    </div>
  );
}
