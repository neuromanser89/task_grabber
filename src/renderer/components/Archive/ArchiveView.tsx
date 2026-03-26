import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Archive, RotateCcw, ChevronRight } from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import { useColumnStore } from '../../stores/columnStore';
import { useBoardStore } from '../../stores/boardStore';
import type { TaskWithAttachments, Board } from '@shared/types';

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins}м назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}ч назад`;
  return `${Math.floor(hrs / 24)}д назад`;
}

const PRIORITY_COLORS: Record<number, string> = {
  0: '#6B7280',
  1: '#3B82F6',
  2: '#F59E0B',
  3: '#EF4444',
};

const PRIORITY_LABELS: Record<number, string> = {
  0: 'Без приоритета',
  1: 'Низкий',
  2: 'Средний',
  3: 'Высокий',
};

interface CtxMenu {
  x: number;
  y: number;
  task: TaskWithAttachments;
  submenuOpen: boolean;
}

interface ArchiveCardProps {
  task: TaskWithAttachments;
  boardName: string;
  columnName: string;
  onContextMenu: (e: React.MouseEvent, task: TaskWithAttachments) => void;
}

function ArchiveCard({ task, boardName, columnName, onContextMenu }: ArchiveCardProps) {
  const priorityColor = PRIORITY_COLORS[task.priority ?? 0];
  const tags = task.tags ?? [];

  return (
    <div
      className="group glass-card rounded-xl p-4 flex flex-col gap-3 transition-all duration-200 hover:border-t-12 hover:shadow-lg cursor-default"
      onContextMenu={(e) => onContextMenu(e, task)}
    >
      {/* Title row */}
      <div className="flex items-start gap-2">
        <span
          className="mt-[5px] w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: priorityColor }}
          title={PRIORITY_LABELS[task.priority ?? 0]}
        />
        <p className="text-[13px] font-semibold text-t-75 leading-snug flex-1 break-words">
          {task.title}
        </p>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-[12px] text-t-45 leading-relaxed line-clamp-3 break-words">
          {task.description}
        </p>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium"
              style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color,
                border: `1px solid ${tag.color}40`,
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-t-04 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Archive size={10} className="text-t-20 flex-shrink-0" />
          <span className="text-[10px] text-t-20 truncate">
            {boardName}
            {columnName ? ` · ${columnName}` : ''}
          </span>
        </div>
        <span className="text-[10px] text-t-20 flex-shrink-0 whitespace-nowrap">
          {task.archived_at ? relativeTime(task.archived_at) : ''}
        </span>
      </div>
    </div>
  );
}

export default function ArchiveView() {
  const { updateTask, moveTask } = useTaskStore();
  const { columns } = useColumnStore();
  const { boards } = useBoardStore();
  const [search, setSearch] = useState('');
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const ctxRef = useRef<HTMLDivElement>(null);
  const [archived, setArchived] = useState<TaskWithAttachments[]>([]);

  useEffect(() => {
    window.electronAPI?.getArchivedTasks?.().then((tasks: TaskWithAttachments[]) => {
      setArchived(tasks ?? []);
    });
  }, []);

  const filtered = search.trim()
    ? archived.filter(
        (t) =>
          t.title.toLowerCase().includes(search.toLowerCase()) ||
          (t.description ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : archived;

  // Build lookup maps
  const columnMap = Object.fromEntries(columns.map((c) => [c.id, c]));
  const boardMap = Object.fromEntries(boards.map((b) => [b.id, b]));

  function getBoardName(task: TaskWithAttachments): string {
    const col = columnMap[task.column_id];
    if (!col?.board_id) return '';
    return boardMap[col.board_id]?.name ?? '';
  }

  function getColumnName(task: TaskWithAttachments): string {
    return columnMap[task.column_id]?.name ?? '';
  }

  const handleContextMenu = useCallback((e: React.MouseEvent, task: TaskWithAttachments) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 240);
    const y = Math.min(e.clientY, window.innerHeight - 200);
    setCtxMenu({ x, y, task, submenuOpen: false });
  }, []);

  const closeCtx = useCallback(() => setCtxMenu(null), []);

  useEffect(() => {
    if (!ctxMenu) return;
    const handler = (e: MouseEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) {
        closeCtx();
      }
    };
    const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCtx(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, [ctxMenu, closeCtx]);

  async function restoreToBoard(task: TaskWithAttachments, boardId: string) {
    const boardCols = columns.filter((c) => c.board_id === boardId);
    const defaultCol = boardCols.find((c) => c.is_default) ?? boardCols[0];
    if (!defaultCol) return;
    closeCtx();
    await updateTask(task.id, { archived_at: null });
    await moveTask(task.id, defaultCol.id, 0);
    setArchived((prev) => prev.filter((t) => t.id !== task.id));
  }

  const count = archived.length;
  const countLabel = count === 1 ? 'задача' : count < 5 ? 'задачи' : 'задач';

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-t-04 flex-shrink-0">
        <Archive size={15} className="text-t-30 flex-shrink-0" />
        <h2 className="text-[14px] font-semibold text-t-70 flex-shrink-0">Архив</h2>
        <span className="text-[11px] text-t-20 flex-shrink-0">
          {count} {countLabel}
        </span>
        <div className="flex-1" />
        <div className="relative flex-shrink-0 w-56">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-t-25 pointer-events-none" />
          <input
            id="archive-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по архиву..."
            className="w-full bg-t-04 border border-t-06 hover:border-t-10 focus:border-accent-blue/40 rounded-lg pl-7 pr-3 py-1.5 text-[12px] text-t-75 outline-none placeholder:text-t-20 transition-all duration-150"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-t-20 hover:text-t-50 transition-colors"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {archived.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-t-20 gap-2">
            <Archive size={32} className="opacity-30" />
            <p className="text-[14px]">Архив пуст</p>
            <p className="text-[12px] text-t-15">Архивированные задачи появятся здесь</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-t-20">
            <p className="text-[13px]">Ничего не найдено по запросу «{search}»</p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '16px',
              alignItems: 'start',
            }}
          >
            {filtered.map((task) => (
              <ArchiveCard
                key={task.id}
                task={task}
                boardName={getBoardName(task)}
                columnName={getColumnName(task)}
                onContextMenu={handleContextMenu}
              />
            ))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {ctxMenu && createPortal(
        <div
          ref={ctxRef}
          className="fixed z-[9999] glass-heavy border border-t-10 rounded-lg shadow-2xl overflow-hidden py-1"
          style={{ top: ctxMenu.y, left: ctxMenu.x, minWidth: 220 }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Restore header */}
          <div
            className="flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold text-t-30 uppercase tracking-wider"
          >
            <div className="flex items-center gap-1.5">
              <RotateCcw size={10} />
              Восстановить на доску
            </div>
          </div>

          {boards.length === 0 ? (
            <div className="px-3 py-2 text-[12px] text-t-30">Нет доступных досок</div>
          ) : (
            boards.map((board: Board) => {
              const boardCols = columns.filter((c) => c.board_id === board.id);
              if (boardCols.length === 0) return null;
              return (
                <button
                  key={board.id}
                  onClick={() => restoreToBoard(ctxMenu.task, board.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-t-60 hover:bg-t-06 hover:text-t-85 transition-colors text-left"
                >
                  {board.icon && <span className="text-[13px]">{board.icon}</span>}
                  <span className="flex-1 truncate">{board.name}</span>
                  <ChevronRight size={11} className="text-t-20 flex-shrink-0" />
                </button>
              );
            })
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
