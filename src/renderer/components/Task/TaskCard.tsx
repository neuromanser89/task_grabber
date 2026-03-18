import React, { useState, useRef, useEffect } from 'react';
import type { TaskWithAttachments } from '@shared/types';
import { PRIORITY_COLORS } from '@shared/constants';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CalendarDays, Timer, Repeat, CheckSquare, Square, ArrowRightLeft } from 'lucide-react';
import { useBoardStore } from '../../stores/boardStore';
import { useColumnStore } from '../../stores/columnStore';
import { useTaskStore } from '../../stores/taskStore';

interface Props {
  task: TaskWithAttachments;
  isDragOverlay?: boolean;
  isSelected?: boolean;
  isBatchSelected?: boolean;
  onBatchSelect?: (task: TaskWithAttachments, mode: 'toggle' | 'shift') => void;
  onClick?: (task: TaskWithAttachments) => void;
}

const SOURCE_EMOJI: Record<string, string> = {
  manual: '✋',
  text: '📝',
  file: '📁',
  email: '✉️',
};

function countChecklist(text: string): [number, number] {
  const matches = text.match(/^[-*]\s+\[([ xX])\]/gm) ?? [];
  const done = matches.filter((m) => /\[([xX])\]/.test(m)).length;
  return [done, matches.length];
}

function formatDueDate(dateStr: string): { label: string; isOverdue: boolean; isToday: boolean } {
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  const isOverdue = diff < 0;
  const isToday = diff === 0;
  let label: string;
  if (isOverdue) label = `просрочено ${Math.abs(diff)}д`;
  else if (isToday) label = 'сегодня';
  else if (diff === 1) label = 'завтра';
  else label = due.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  return { label, isOverdue, isToday };
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins}м назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}ч назад`;
  return `${Math.floor(hrs / 24)}д назад`;
}

export default function TaskCard({ task, isDragOverlay = false, isSelected = false, isBatchSelected = false, onBatchSelect, onClick }: Props) {
  const priorityColor = PRIORITY_COLORS[task.priority ?? 0];
  const hasAttachments = task.attachments && task.attachments.length > 0;
  const { boards } = useBoardStore();
  const { columns } = useColumnStore();
  const { moveTask, tasks } = useTaskStore();

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const ctxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = (e: MouseEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) {
        setCtxMenu(null);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [ctxMenu]);

  const {
    attributes,
    listeners: rawListeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  // Filter out right-click from drag listeners so context menu works
  const listeners = rawListeners ? {
    ...rawListeners,
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button === 2) return; // right-click — don't start drag
      rawListeners.onPointerDown?.(e);
    },
  } : undefined;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !isDragOverlay ? 0.25 : 1,
  };

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    // Release any pointer capture that dnd-kit may have set
    try {
      (e.target as HTMLElement).releasePointerCapture?.((e as unknown as PointerEvent).pointerId);
    } catch { /* ignore */ }
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }

  async function handleMoveToBoard(targetBoardId: string) {
    setCtxMenu(null);
    // Fetch fresh columns via IPC to ensure we have target board's columns
    const allColumns = (await window.electronAPI?.getColumns() ?? []) as typeof columns;
    const boardCols = allColumns.filter(c => c.board_id === targetBoardId);
    const targetCol = boardCols.find(c => c.is_default === 1) ?? boardCols[0];
    if (!targetCol) return;
    const tasksInCol = tasks.filter(t => t.column_id === targetCol.id);
    const maxOrder = tasksInCol.reduce((m, t) => Math.max(m, t.sort_order), -1) + 1;
    await moveTask(task.id, targetCol.id, maxOrder);
  }

  function handleClick(e: React.MouseEvent) {
    if (isDragging) return;
    if (onBatchSelect && (e.ctrlKey || e.metaKey)) {
      e.stopPropagation();
      onBatchSelect(task, 'toggle');
      return;
    }
    if (onBatchSelect && e.shiftKey) {
      e.stopPropagation();
      onBatchSelect(task, 'shift');
      return;
    }
    if (onClick) { e.stopPropagation(); onClick(task); }
  }

  // Current board of this task's column
  const taskBoardId = columns.find(c => c.id === task.column_id)?.board_id ?? null;
  const otherBoards = boards.filter(b => b.id !== taskBoardId);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={`group relative rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all duration-200 ${
        isDragOverlay
          ? 'glass-heavy shadow-drag rotate-[1.5deg] scale-[1.02] border-t-15'
          : isBatchSelected
          ? 'glass-card bg-accent-purple/[0.08] border border-accent-purple/40 shadow-[0_0_12px_rgba(139,92,246,0.15),0_0_0_1px_rgba(139,92,246,0.25)] -translate-y-[1px]'
          : isSelected
          ? 'glass-card bg-accent-blue/[0.06] border border-accent-blue/40 shadow-[0_0_12px_rgba(59,130,246,0.15),0_0_0_1px_rgba(59,130,246,0.25)] -translate-y-[1px]'
          : 'glass-card hover:border-t-08 hover:shadow-card-hover hover:-translate-y-[2px] hover:brightness-110'
      }`}
    >
      {/* Batch select checkbox — shown on hover or when selected */}
      {onBatchSelect && (
        <button
          onClick={(e) => { e.stopPropagation(); onBatchSelect(task, 'toggle'); }}
          className={`absolute top-2 right-2 z-10 transition-opacity duration-150 ${
            isBatchSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-40 hover:!opacity-100'
          }`}
          title="Выбрать задачу (Ctrl+клик или Shift+клик)"
        >
          {isBatchSelected
            ? <CheckSquare size={13} className="text-accent-purple" />
            : <Square size={13} className="text-t-40" />
          }
        </button>
      )}

      {/* Priority stripe with glow */}
      {task.priority > 0 && (
        <>
          <div
            className="absolute left-0 top-2.5 bottom-2.5 w-[2px] rounded-r-full"
            style={{ backgroundColor: priorityColor }}
          />
          <div
            className="absolute left-0 top-2.5 bottom-2.5 w-[2px] rounded-r-full blur-sm opacity-50"
            style={{ backgroundColor: priorityColor }}
          />
        </>
      )}

      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium text-t-85 leading-snug line-clamp-2 flex-1">
          {task.title}
        </p>
        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.electronAPI?.ipcSend('focus:openTask', task.id);
            }}
            className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity duration-200 text-t-40 hover:text-blue-400 p-0.5 rounded"
            title="Начать фокус-сессию"
          >
            <Timer size={11} />
          </button>
          <span className="text-[10px] opacity-0 group-hover:opacity-40 transition-opacity duration-200">
            {SOURCE_EMOJI[task.source_type ?? 'manual']}
          </span>
        </div>
      </div>

      {task.description && (() => {
        const [done, total] = countChecklist(task.description);
        if (total > 0) {
          // Show checklist progress bar instead of raw text
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          return (
            <div className="mt-1.5">
              <div className="flex items-center justify-between text-[10px] text-t-25 mb-1">
                <span>{done}/{total}</span>
                <span>{pct}%</span>
              </div>
              <div className="h-[3px] bg-t-06 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#10B981' : '#3B82F6' }}
                />
              </div>
            </div>
          );
        }
        return (
          <p className="text-[11px] text-t-30 mt-1.5 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        );
      })()}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {task.tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color,
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-2.5 text-[10px] text-t-20">
        <span className="transition-colors group-hover:text-t-30">{relativeTime(task.created_at)}</span>
        <div className="flex items-center gap-1.5">
          {task.recurrence_rule && (
            <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-violet-500/10 text-violet-400/70" title="Повторяющаяся задача">
              <Repeat size={8} />
            </span>
          )}
          {(task.time_spent ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-t-20">
              <Timer size={9} />
              {Math.round((task.time_spent ?? 0) / 60)}м
            </span>
          )}
          {task.due_date && (() => {
            const { label, isOverdue, isToday } = formatDueDate(task.due_date);
            return (
              <span
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  isOverdue
                    ? 'bg-red-500/15 text-red-400/80'
                    : isToday
                    ? 'bg-amber-500/15 text-amber-400/80'
                    : 'bg-t-05 text-t-30'
                }`}
              >
                <CalendarDays size={9} />
                {label}
              </span>
            );
          })()}
          {hasAttachments && <span className="text-t-25">📎</span>}
        </div>
      </div>

      {/* Context menu: Move to board */}
      {ctxMenu && (
        <div
          ref={ctxRef}
          className="fixed z-[9999] glass-heavy border border-t-10 rounded-lg shadow-2xl overflow-hidden py-1"
          style={{ top: ctxMenu.y, left: ctxMenu.x, minWidth: 180 }}
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold text-t-30 uppercase tracking-wider flex items-center gap-1.5">
            <ArrowRightLeft size={10} />
            Перенести на доску
          </div>
          {otherBoards.length > 0 ? otherBoards.map(b => (
            <button
              key={b.id}
              onClick={() => handleMoveToBoard(b.id)}
              className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-t-70 hover:bg-t-06 hover:text-t-90 transition-colors text-left"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: b.color ?? '#6B7280' }}
              />
              {b.name}
            </button>
          )) : (
            <div className="px-3 py-2 text-[11px] text-t-30 italic">Нет других досок</div>
          )}
        </div>
      )}
    </div>
  );
}
