import React, { useRef, useState } from 'react';
import type { Column as ColumnType, TaskWithAttachments } from '@shared/types';
import TaskCard from '../Task/TaskCard';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ColumnEditor from './ColumnEditor';

interface Props {
  column: ColumnType;
  tasks: TaskWithAttachments[];
  onTaskClick?: (task: TaskWithAttachments) => void;
  isDragOverlay?: boolean;
  selectedTaskId?: string | null;
  selectedBatchIds?: Set<string>;
  onBatchSelect?: (task: TaskWithAttachments, mode: 'toggle' | 'shift') => void;
  isDropTarget?: boolean;
  updateCounts?: Record<string, number>;
  latestUpdates?: Record<string, { content: string; created_at: string }>;
  onUpdateCountChange?: () => void;
}

export default function Column({ column, tasks, onTaskClick, isDragOverlay, selectedTaskId, selectedBatchIds, onBatchSelect, isDropTarget, updateCounts, latestUpdates, onUpdateCountChange }: Props) {
  const sorted = [...tasks].sort((a, b) => a.sort_order - b.sort_order);
  const taskIds = sorted.map((t) => t.id);

  const wipLimit = column.wip_limit ?? 0;
  const isOverWip = wipLimit > 0 && tasks.length >= wipLimit;

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: column.id });

  const {
    attributes,
    listeners,
    setNodeRef: setSortRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `col::${column.id}` });

  const headerRef = useRef<HTMLDivElement>(null);
  const [editorAnchor, setEditorAnchor] = useState<DOMRect | null>(null);

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    if (headerRef.current) {
      setEditorAnchor(headerRef.current.getBoundingClientRect());
    }
  }

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <>
      <div
        ref={(node) => { setSortRef(node); setDropRef(node); }}
        style={{
          ...(isDragOverlay ? {} : style),
          outline: (isOver || isDropTarget)
            ? '2px solid rgba(59, 130, 246, 0.5)'
            : isOverWip
            ? '2px solid rgba(239, 68, 68, 0.3)'
            : 'none',
          outlineOffset: '-2px',
        }}
        className={`flex flex-col min-w-[180px] w-full max-w-[320px] flex-1 rounded-xl overflow-hidden glass transition-all duration-300 ${
          (isOver || isDropTarget) ? 'bg-accent-blue/[0.02]' : ''
        }`}
      >
        {/* Header with colored top accent */}
        <div className={`relative ${(isOver || isDropTarget) ? 'bg-accent-blue/[0.06]' : ''}`} ref={headerRef}>
          {/* Colored top line — pulses red when WIP exceeded */}
          <div
            className={`absolute top-0 left-4 right-4 h-[2px] rounded-full transition-all duration-300 ${isOverWip ? 'opacity-90 animate-glow-pulse' : 'opacity-60'}`}
            style={{ backgroundColor: isOverWip ? '#EF4444' : column.color }}
          />
          {/* Red glow bleed when over WIP */}
          {isOverWip && (
            <div className="absolute top-0 left-4 right-4 h-[2px] rounded-full blur-[4px] opacity-50 animate-glow-pulse" style={{ backgroundColor: '#EF4444' }} />
          )}
          <div
            className="flex items-center gap-2.5 px-3.5 py-3 border-b border-t-04 cursor-pointer select-none"
            onContextMenu={handleContextMenu}
            title="Правый клик для настройки"
            {...(!isDragOverlay ? attributes : {})}
            {...(!isDragOverlay ? listeners : {})}
          >
            <div
              className="w-2 h-2 rounded-full ring-2 ring-offset-1 ring-offset-transparent flex-shrink-0"
              style={{
                backgroundColor: column.color,
                boxShadow: `0 0 8px ${column.color}40`,
                '--tw-ring-color': `${column.color}30`,
              } as React.CSSProperties}
            />
            <span className={`font-medium text-[13px] flex-1 tracking-tight truncate ${isOverWip ? 'text-red-400' : 'text-t-75'}`}>
              {column.name}
            </span>
            <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium tabular-nums flex-shrink-0 ${
              isOverWip
                ? 'text-red-400 bg-red-500/10'
                : 'text-t-25 bg-t-04'
            }`}>
              {wipLimit > 0 ? `${tasks.length}/${wipLimit}` : tasks.length}
            </span>
          </div>
        </div>

        {/* Tasks area */}
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div
            className={`flex-1 overflow-y-auto p-2 flex flex-col gap-1.5 min-h-[80px] transition-all duration-300 ${
              (isOver || isDropTarget) ? 'bg-accent-blue/[0.04] column-drop-active' : ''
            }`}
          >
            {sorted.map((task, index) => (
              <div key={task.id} style={{ animationDelay: `${index * 30}ms` }} className="animate-fade-in transition-all duration-300">
                <TaskCard
                  task={task}
                  onClick={onTaskClick}
                  isSelected={selectedTaskId === task.id}
                  isBatchSelected={selectedBatchIds?.has(task.id)}
                  onBatchSelect={onBatchSelect}
                  updateCount={updateCounts?.[task.id]}
                  lastUpdate={latestUpdates?.[task.id]}
                  onUpdateCountChange={onUpdateCountChange}
                />
              </div>
            ))}
            {sorted.length === 0 && (
              <div className="flex-1 flex items-center justify-center py-8">
                <span className="text-[11px] text-t-15 italic">Пусто</span>
              </div>
            )}
          </div>
        </SortableContext>
      </div>

      {editorAnchor && (
        <ColumnEditor
          column={column}
          anchorRect={editorAnchor}
          onClose={() => setEditorAnchor(null)}
        />
      )}
    </>
  );
}
