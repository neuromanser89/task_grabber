import React, { useState } from 'react';
import type { Column, TaskWithAttachments } from '@shared/types';
import { Trash2, MoveRight, Archive, X, CheckSquare } from 'lucide-react';

interface Props {
  selectedIds: Set<string>;
  tasks: TaskWithAttachments[];
  columns: Column[];
  onClear: () => void;
  onDelete: (ids: string[]) => void;
  onMove: (ids: string[], columnId: string) => void;
  onArchive: (ids: string[]) => void;
}

export default function BatchToolbar({ selectedIds, tasks, columns, onClear, onDelete, onMove, onArchive }: Props) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (selectedIds.size === 0) return null;

  const ids = Array.from(selectedIds);
  const count = ids.length;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="relative glass-heavy border border-t-12 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl min-w-[420px]">
        {/* Top gradient accent */}
        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-accent-purple/30 to-transparent rounded-full" />
        {/* Selection info */}
        <div className="flex items-center gap-2 mr-2">
          <CheckSquare size={14} className="text-accent-blue" />
          <span className="text-[13px] font-medium text-t-80">
            {count} {count === 1 ? 'задача' : count < 5 ? 'задачи' : 'задач'}
          </span>
        </div>

        <div className="w-px h-5 bg-t-08" />

        {/* Move to column */}
        <div className="relative">
          <button
            onClick={() => setShowMoveMenu(!showMoveMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-t-60 hover:text-t-85 hover:bg-t-06 transition-all duration-150"
          >
            <MoveRight size={13} />
            Переместить
          </button>
          {showMoveMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMoveMenu(false)} />
              <div className="absolute bottom-full left-0 mb-2 z-20 glass-heavy border border-t-10 rounded-xl overflow-hidden min-w-[160px] shadow-xl">
                {columns.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => {
                      onMove(ids, col.id);
                      setShowMoveMenu(false);
                      onClear();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-t-60 hover:text-t-85 hover:bg-t-06 transition-colors text-left"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: col.color }}
                    />
                    {col.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Archive */}
        <button
          onClick={() => { onArchive(ids); onClear(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-t-60 hover:text-t-85 hover:bg-t-06 transition-all duration-150"
        >
          <Archive size={13} />
          Архивировать
        </button>

        {/* Delete */}
        {confirmDelete ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-red-400">Удалить {count}?</span>
            <button
              onClick={() => { onDelete(ids); onClear(); setConfirmDelete(false); }}
              className="px-2.5 py-1 rounded-lg text-[11px] text-white bg-red-500/80 hover:bg-red-500 transition-colors"
            >
              Да
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2.5 py-1 rounded-lg text-[11px] text-t-40 hover:text-t-60 bg-t-05 hover:bg-t-08 transition-colors"
            >
              Нет
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-t-60 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
          >
            <Trash2 size={13} />
            Удалить
          </button>
        )}

        <div className="w-px h-5 bg-t-08" />

        {/* Clear selection */}
        <button
          onClick={onClear}
          className="p-1.5 rounded-lg text-t-30 hover:text-t-60 hover:bg-t-06 transition-all duration-150"
          title="Снять выделение"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
