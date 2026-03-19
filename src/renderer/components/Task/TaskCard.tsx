import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { TaskWithAttachments } from '@shared/types';
import { PRIORITY_COLORS, COLUMN_TYPE_STATUS } from '@shared/constants';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CalendarDays, Timer, Repeat, CheckSquare, Square, ArrowRightLeft, Check, Circle, Loader, PauseCircle, CheckCircle2, XCircle, MessageSquare, Send } from 'lucide-react';
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
  updateCount?: number;
  onUpdateCountChange?: () => void;
}

const SOURCE_EMOJI: Record<string, string> = {
  manual: '✋',
  text: '📝',
  file: '📁',
  email: '✉️',
};

import { countChecklist } from '../../utils/checklist';

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

export default function TaskCard({ task, isDragOverlay = false, isSelected = false, isBatchSelected = false, onBatchSelect, onClick, updateCount, onUpdateCountChange }: Props) {
  const priorityColor = PRIORITY_COLORS[task.priority ?? 0];
  const hasAttachments = task.attachments && task.attachments.length > 0;
  const { boards } = useBoardStore();
  const { columns } = useColumnStore();
  const { moveTask, tasks } = useTaskStore();

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [flyAway, setFlyAway] = useState<{ targetX: number; targetY: number } | null>(null);
  const [quickUpdate, setQuickUpdate] = useState('');
  const [showUpdateInput, setShowUpdateInput] = useState(false);
  const quickUpdateRef = useRef<HTMLInputElement>(null);
  const ctxRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

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
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !isDragOverlay ? 0.25 : 1,
  };

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }


  async function handleComplete(e: React.MouseEvent) {
    e.stopPropagation();
    const doneCol = columns.find((c) => c.column_type === 'done');
    if (!doneCol || task.column_id === doneCol.id) return;
    const tasksInCol = tasks.filter((t) => t.column_id === doneCol.id);
    const maxOrder = tasksInCol.reduce((m, t) => Math.max(m, t.sort_order), -1) + 1;
    await moveTask(task.id, doneCol.id, maxOrder);
  }

  async function handleMoveToBoard(targetBoardId: string) {
    setCtxMenu(null);

    // Fly-away animation: card shrinks and flies to BoardSwitcher
    const switcher = document.querySelector('[data-board-switcher]');
    if (switcher && cardRef.current) {
      const switcherRect = switcher.getBoundingClientRect();
      const cardRect = cardRef.current.getBoundingClientRect();
      setFlyAway({
        targetX: switcherRect.left + switcherRect.width / 2 - cardRect.left - cardRect.width / 2,
        targetY: switcherRect.top + switcherRect.height / 2 - cardRect.top - cardRect.height / 2,
      });
      // Wait for fly animation, then moveTask will remove from DOM
      await new Promise((r) => setTimeout(r, 350));
    }

    const allColumns = (await window.electronAPI?.getColumns() ?? []) as typeof columns;
    let boardCols = allColumns.filter(c => c.board_id === targetBoardId);

    // If target board has no columns, create default set
    if (boardCols.length === 0) {
      const defaults = [
        { name: 'Новые', color: '#3B82F6', sort_order: 0, is_default: 1, column_type: 'backlog' },
        { name: 'В работе', color: '#F59E0B', sort_order: 1, is_default: 0, column_type: 'in_progress' },
        { name: 'Готово', color: '#10B981', sort_order: 2, is_default: 0, column_type: 'done' },
      ];
      for (const d of defaults) {
        const col = await window.electronAPI!.createColumn({ ...d, icon: null, board_id: targetBoardId });
        boardCols.push(col);
      }
      useColumnStore.getState().fetchColumns();
    }

    const targetCol = boardCols.find(c => c.is_default === 1) ?? boardCols[0];
    if (!targetCol) return;
    const tasksInCol = tasks.filter(t => t.column_id === targetCol.id);
    const maxOrder = tasksInCol.reduce((m, t) => Math.max(m, t.sort_order), -1) + 1;
    await moveTask(task.id, targetCol.id, maxOrder);
    setFlyAway(null);
  }

  async function handleQuickUpdate() {
    const text = quickUpdate.trim();
    if (!text) return;
    await window.electronAPI?.createTaskUpdate?.(task.id, text);
    setQuickUpdate('');
    setShowUpdateInput(false);
    setCtxMenu(null);
    onUpdateCountChange?.();
  }

  function handleClick(e: React.MouseEvent) {
    if (isDragging || ctxMenu || flyAway) return;
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

  const flyCardStyle: React.CSSProperties = flyAway ? {
    ...style,
    transform: `translate(${flyAway.targetX}px, ${flyAway.targetY}px) scale(0.05)`,
    opacity: 0,
    transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-out',
    pointerEvents: 'none' as const,
  } : style;

  return (
    <div
      ref={(node) => { setNodeRef(node); (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node; }}
      style={flyCardStyle}
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
          {columns.some((c) => c.column_type === 'done' && c.id !== task.column_id) && (
            <button
              onClick={handleComplete}
              className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity duration-200 text-t-40 hover:text-emerald-400 p-0.5 rounded"
              title="Завершить задачу"
            >
              <Check size={11} />
            </button>
          )}
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
        <div className="flex items-center gap-1.5">
          {(() => {
            const col = columns.find(c => c.id === task.column_id);
            const ct = col?.column_type;
            const status = ct ? COLUMN_TYPE_STATUS[ct] : null;
            if (!status) return null;
            const Icon = ct === 'backlog' ? Circle : ct === 'in_progress' ? Loader : ct === 'waiting' ? PauseCircle : ct === 'done' ? CheckCircle2 : XCircle;
            return (
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium leading-none"
                style={{ backgroundColor: status.bg, color: status.color }}
              >
                <Icon size={8} className={ct === 'in_progress' ? 'animate-spin' : ''} style={{ animationDuration: '3s' }} />
                {status.label}
              </span>
            );
          })()}
          <span className="transition-colors group-hover:text-t-30">{relativeTime(task.created_at)}</span>
        </div>
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
          {(updateCount ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-t-25" title={`${updateCount} апдейтов`}>
              <MessageSquare size={9} />
              <span className="text-[9px] tabular-nums">{updateCount}</span>
            </span>
          )}
          {hasAttachments && <span className="text-t-25">📎</span>}
        </div>
      </div>

      {/* Context menu: rendered via portal to escape transform containing block + overflow-hidden */}
      {ctxMenu && createPortal(
        <div
          ref={ctxRef}
          className="fixed z-[9999] glass-heavy border border-t-10 rounded-lg shadow-2xl overflow-hidden py-1"
          style={{ top: ctxMenu.y, left: ctxMenu.x, minWidth: 220 }}
          onMouseDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          {/* Quick update */}
          <div className="px-3 py-1.5 text-[10px] font-semibold text-t-30 uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare size={10} />
            Быстрый апдейт
          </div>
          {showUpdateInput ? (
            <div className="px-2.5 pb-2 flex items-center gap-1">
              <input
                ref={quickUpdateRef}
                value={quickUpdate}
                onChange={(e) => setQuickUpdate(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleQuickUpdate();
                  if (e.key === 'Escape') { setShowUpdateInput(false); setQuickUpdate(''); }
                }}
                placeholder="Что нового..."
                className="flex-1 bg-t-04 border border-t-08 focus:border-accent-blue/40 rounded px-2 py-1 text-[11px] text-t-80 outline-none placeholder-t-20 transition-colors"
                autoFocus
              />
              <button
                onClick={handleQuickUpdate}
                disabled={!quickUpdate.trim()}
                className="w-6 h-6 flex items-center justify-center rounded text-t-30 hover:text-accent-blue hover:bg-t-06 transition-colors disabled:opacity-30"
              >
                <Send size={11} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setShowUpdateInput(true); setTimeout(() => quickUpdateRef.current?.focus(), 50); }}
              className="w-full px-3 py-1.5 text-[12px] text-t-50 hover:bg-t-06 hover:text-t-80 transition-colors text-left"
            >
              Написать апдейт...
            </button>
          )}

          <div className="h-px bg-t-06 my-1" />

          {/* Move to board */}
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
        </div>,
        document.body
      )}
    </div>
  );
}
