import React, { useEffect, useState } from 'react';
import { useTaskStore } from '../../stores/taskStore';
import Column from './Column';
import TaskCard from '../Task/TaskCard';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { Task } from '@shared/types';

export default function KanbanBoard() {
  const { columns, tasks, fetchAll, moveTask } = useTaskStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Dragging over a column directly
    const overColumn = columns.find((c) => c.id === overId);
    if (overColumn && activeTask.column_id !== overColumn.id) {
      const tasksInTarget = tasks
        .filter((t) => t.column_id === overColumn.id)
        .sort((a, b) => a.sort_order - b.sort_order);
      const newSortOrder =
        tasksInTarget.length > 0
          ? tasksInTarget[tasksInTarget.length - 1].sort_order + 1
          : 0;
      moveTask(activeId, overColumn.id, newSortOrder);
      return;
    }

    // Dragging over another task
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask && activeTask.column_id !== overTask.column_id) {
      moveTask(activeId, overTask.column_id, overTask.sort_order);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const activeTask = tasks.find((t) => t.id === activeId);
    const overTask = tasks.find((t) => t.id === overId);

    if (!activeTask) return;

    // If dropped on a task in the same column — reorder
    if (overTask && activeTask.column_id === overTask.column_id) {
      const columnTasks = tasks
        .filter((t) => t.column_id === activeTask.column_id)
        .sort((a, b) => a.sort_order - b.sort_order);

      const oldIndex = columnTasks.findIndex((t) => t.id === activeId);
      const newIndex = columnTasks.findIndex((t) => t.id === overId);
      const reordered = arrayMove(columnTasks, oldIndex, newIndex);

      // Update sort orders for moved tasks
      reordered.forEach((task, idx) => {
        if (task.sort_order !== idx) {
          moveTask(task.id, task.column_id, idx);
        }
      });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-1 gap-3 p-4 overflow-x-auto overflow-y-hidden">
        {columns.map((col) => (
          <Column
            key={col.id}
            column={col}
            tasks={tasks.filter((t) => t.column_id === col.id)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} isDragOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
