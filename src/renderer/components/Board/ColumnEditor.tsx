import React, { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { Column } from '@shared/types';
import { useColumnStore } from '../../stores/columnStore';
import { useTaskStore } from '../../stores/taskStore';

const PRESET_COLORS = [
  '#3B82F6', '#F59E0B', '#8B5CF6', '#10B981', '#6B7280',
  '#EF4444', '#EC4899', '#14B8A6', '#F97316', '#84CC16',
  '#06B6D4', '#A78BFA',
];

interface Props {
  column: Column;
  anchorRect: DOMRect;
  onClose: () => void;
}

export default function ColumnEditor({ column, anchorRect, onClose }: Props) {
  const { updateColumn, deleteColumn, columns } = useColumnStore();
  const { tasks } = useTaskStore();

  const [name, setName] = useState(column.name);
  const [color, setColor] = useState(column.color);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [moveToId, setMoveToId] = useState<string>('');

  const containerRef = useRef<HTMLDivElement>(null);

  const tasksInColumn = tasks.filter((t) => t.column_id === column.id);
  const otherColumns = columns.filter((c) => c.id !== column.id);

  // Position popover below the anchor, keep inside viewport
  const style: React.CSSProperties = (() => {
    const popW = 220;
    const popH = 260;
    let left = anchorRect.left;
    let top = anchorRect.bottom + 6;

    if (left + popW > window.innerWidth - 8) left = window.innerWidth - popW - 8;
    if (top + popH > window.innerHeight - 8) top = anchorRect.top - popH - 6;

    return { position: 'fixed', top, left, width: popW, zIndex: 9999 };
  })();

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [onClose]);

  async function handleSave() {
    if (!name.trim()) return;
    await updateColumn(column.id, { name: name.trim(), color });
    onClose();
  }

  async function handleDelete() {
    if (tasksInColumn.length > 0) {
      if (!confirmDelete) {
        setConfirmDelete(true);
        return;
      }
      if (!moveToId) return;
      // Move tasks to selected column
      const { moveTask } = useTaskStore.getState();
      const targetTasks = tasks.filter((t) => t.column_id === moveToId);
      let nextOrder = targetTasks.length > 0
        ? Math.max(...targetTasks.map((t) => t.sort_order)) + 1
        : 0;
      for (const task of tasksInColumn) {
        await moveTask(task.id, moveToId, nextOrder++);
      }
    }
    await deleteColumn(column.id);
    onClose();
  }

  return (
    <div
      ref={containerRef}
      style={style}
      className="relative rounded-xl glass-heavy shadow-2xl p-3 flex flex-col gap-2.5 overflow-hidden"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Top gradient line */}
      <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-accent-blue/30 to-transparent rounded-full" />

      {/* Name */}
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
        className="w-full bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.1] rounded-lg px-2.5 py-1.5 text-[12px] text-white/90 outline-none focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/15 transition-all duration-200"
        placeholder="Название колонки"
      />

      {/* Color palette */}
      <div>
        <p className="text-[10px] text-white/30 mb-1.5 uppercase tracking-wider">Цвет</p>
        <div className="grid grid-cols-6 gap-1.5">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-6 h-6 rounded-full transition-transform hover:scale-110"
              style={{
                backgroundColor: c,
                boxShadow: color === c ? `0 0 0 2px #fff, 0 0 0 3px ${c}` : undefined,
                outline: color === c ? '2px solid rgba(255,255,255,0.6)' : undefined,
                outlineOffset: color === c ? '1px' : undefined,
              }}
            />
          ))}
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className="w-full py-1.5 rounded-lg text-[12px] font-medium text-white/90 transition-all duration-200 hover:brightness-110 active:scale-[0.97]"
        style={{ backgroundColor: `${color}cc`, boxShadow: `0 0 12px ${color}20` }}
      >
        Сохранить
      </button>

      {/* Delete */}
      {!confirmDelete ? (
        <button
          onClick={handleDelete}
          className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-[11px] text-white/35 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 size={11} />
          Удалить колонку
        </button>
      ) : (
        <div className="flex flex-col gap-1.5">
          {tasksInColumn.length > 0 && (
            <>
              <p className="text-[10px] text-amber-400/80 text-center">
                {tasksInColumn.length} задач — перенести в:
              </p>
              <select
                value={moveToId}
                onChange={(e) => setMoveToId(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.1] focus:border-accent-blue/50 outline-none rounded-lg px-2 py-1 text-[11px] text-white/80 transition-all duration-200"
              >
                <option value="">— выберите колонку —</option>
                {otherColumns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </>
          )}
          <button
            onClick={handleDelete}
            disabled={tasksInColumn.length > 0 && !moveToId}
            className="w-full py-1.5 rounded-lg text-[11px] font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-40"
          >
            Подтвердить удаление
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="w-full py-1 text-[10px] text-white/30 hover:text-white/50 transition-colors"
          >
            Отмена
          </button>
        </div>
      )}
    </div>
  );
}
