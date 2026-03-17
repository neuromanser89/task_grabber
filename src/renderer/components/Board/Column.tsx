import React from 'react';
import type { Column as ColumnType, Task } from '@shared/types';
import TaskCard from '../Task/TaskCard';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface Props {
  column: ColumnType;
  tasks: Task[];
}

export default function Column({ column, tasks }: Props) {
  const sorted = [...tasks].sort((a, b) => a.sort_order - b.sort_order);
  const taskIds = sorted.map((t) => t.id);

  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex flex-col w-64 flex-shrink-0 bg-[#1A1A2E] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: column.color }} />
        <span className="font-medium text-sm text-white/80 flex-1">{column.name}</span>
        <span className="text-xs text-white/30 bg-white/5 px-1.5 py-0.5 rounded">
          {tasks.length}
        </span>
      </div>

      {/* Tasks */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex-1 overflow-y-auto p-2 flex flex-col gap-2 min-h-[80px] transition-colors ${
            isOver ? 'bg-white/5' : ''
          }`}
        >
          {sorted.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
