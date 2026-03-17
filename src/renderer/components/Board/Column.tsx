import React from 'react';
import type { Column as ColumnType, Task } from '@shared/types';
import TaskCard from '../Task/TaskCard';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface Props {
  column: ColumnType;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

export default function Column({ column, tasks, onTaskClick }: Props) {
  const sorted = [...tasks].sort((a, b) => a.sort_order - b.sort_order);
  const taskIds = sorted.map((t) => t.id);

  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex flex-col w-[272px] flex-shrink-0 rounded-xl overflow-hidden glass transition-all duration-300">
      {/* Header with colored top accent */}
      <div className="relative">
        {/* Colored top line */}
        <div
          className="absolute top-0 left-4 right-4 h-[2px] rounded-full opacity-60"
          style={{ backgroundColor: column.color }}
        />
        <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-white/[0.04]">
          <div
            className="w-2 h-2 rounded-full ring-2 ring-offset-1 ring-offset-transparent"
            style={{
              backgroundColor: column.color,
              boxShadow: `0 0 8px ${column.color}40`,
              ringColor: `${column.color}30`,
            }}
          />
          <span className="font-medium text-[13px] text-white/75 flex-1 tracking-tight">
            {column.name}
          </span>
          <span className="text-[11px] text-white/25 bg-white/[0.04] px-2 py-0.5 rounded-md font-medium tabular-nums">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Tasks area */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex-1 overflow-y-auto p-2 flex flex-col gap-1.5 min-h-[80px] transition-all duration-300 ${
            isOver
              ? 'bg-accent-blue/[0.04] column-drop-active'
              : ''
          }`}
        >
          {sorted.map((task, index) => (
            <div key={task.id} style={{ animationDelay: `${index * 30}ms` }} className="animate-fade-in">
              <TaskCard task={task} onClick={onTaskClick} />
            </div>
          ))}
          {sorted.length === 0 && (
            <div className="flex-1 flex items-center justify-center py-8">
              <span className="text-[11px] text-white/15 italic">Пусто</span>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
