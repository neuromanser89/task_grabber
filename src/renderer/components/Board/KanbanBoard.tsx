import React, { useEffect, useRef, useState } from 'react';
import { useTaskStore } from '../../stores/taskStore';
import { useColumnStore } from '../../stores/columnStore';
import Column from './Column';
import TaskCard from '../Task/TaskCard';
import TaskDetail from '../Task/TaskDetail';
import DropZone from '../DropZone/DropZone';
import { Plus } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import type { Column as ColumnType, TaskWithAttachments } from '@shared/types';

const RANDOM_COLORS = [
  '#3B82F6', '#F59E0B', '#8B5CF6', '#10B981',
  '#EF4444', '#EC4899', '#14B8A6', '#F97316',
];

export default function KanbanBoard() {
  const { tasks, fetchAll, moveTask, filteredTasks } = useTaskStore();
  const { columns, fetchColumns, createColumn, reorderColumns } = useColumnStore();

  const [activeTask, setActiveTask] = useState<TaskWithAttachments | null>(null);
  const [activeColumn, setActiveColumn] = useState<ColumnType | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskWithAttachments | null>(null);

  // Inline new column state
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColName, setNewColName] = useState('');
  const newColInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAll();
    fetchColumns();
  }, [fetchAll, fetchColumns]);

  useEffect(() => {
    if (addingColumn && newColInputRef.current) {
      newColInputRef.current.focus();
    }
  }, [addingColumn]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const sortedColumns = [...columns].sort((a, b) => a.sort_order - b.sort_order);
  const columnDndIds = sortedColumns.map((c) => `col::${c.id}`);

  function isDndColumnId(id: string) {
    return id.startsWith('col::');
  }

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string;
    if (isDndColumnId(id)) {
      const col = columns.find((c) => `col::${c.id}` === id);
      setActiveColumn(col ?? null);
    } else {
      const task = tasks.find((t) => t.id === id);
      setActiveTask(task ?? null);
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Ignore column drags here
    if (isDndColumnId(activeId)) return;

    const draggedTask = tasks.find((t) => t.id === activeId);
    if (!draggedTask) return;

    // Dragging over a column
    const overColumn = columns.find((c) => c.id === overId);
    if (overColumn && draggedTask.column_id !== overColumn.id) {
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
    if (overTask && draggedTask.column_id !== overTask.column_id) {
      moveTask(activeId, overTask.column_id, overTask.sort_order);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    setActiveColumn(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    // Column reorder
    if (isDndColumnId(activeId) && isDndColumnId(overId)) {
      const oldIndex = sortedColumns.findIndex((c) => `col::${c.id}` === activeId);
      const newIndex = sortedColumns.findIndex((c) => `col::${c.id}` === overId);
      const reordered = arrayMove(sortedColumns, oldIndex, newIndex).map((c, idx) => ({
        ...c,
        sort_order: idx,
      }));
      reorderColumns(reordered);
      return;
    }

    // Task reorder within same column
    const draggedTask = tasks.find((t) => t.id === activeId);
    const overTask = tasks.find((t) => t.id === overId);

    if (!draggedTask) return;

    if (overTask && draggedTask.column_id === overTask.column_id) {
      const columnTasks = tasks
        .filter((t) => t.column_id === draggedTask.column_id)
        .sort((a, b) => a.sort_order - b.sort_order);

      const oldIndex = columnTasks.findIndex((t) => t.id === activeId);
      const newIndex = columnTasks.findIndex((t) => t.id === overId);
      const reordered = arrayMove(columnTasks, oldIndex, newIndex);

      reordered.forEach((task, idx) => {
        if (task.sort_order !== idx) {
          moveTask(task.id, task.column_id, idx);
        }
      });
    }
  }

  async function handleAddColumn() {
    const name = newColName.trim();
    if (!name) {
      setAddingColumn(false);
      setNewColName('');
      return;
    }
    const color = RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)];
    await createColumn({
      name,
      color,
      icon: null,
      sort_order: columns.length,
      is_default: 0,
    });
    setAddingColumn(false);
    setNewColName('');
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={columnDndIds} strategy={horizontalListSortingStrategy}>
          <div className="relative flex flex-1 gap-3 p-4 overflow-x-auto overflow-y-hidden items-start">
            {/* Ambient glow */}
            <div className="pointer-events-none absolute top-0 left-1/4 w-[500px] h-[300px] bg-accent-blue/[0.02] rounded-full blur-[120px]" />
            <div className="pointer-events-none absolute bottom-0 right-1/4 w-[400px] h-[200px] bg-accent-purple/[0.02] rounded-full blur-[100px]" />

            {sortedColumns.map((col) => (
              <Column
                key={col.id}
                column={col}
                tasks={filteredTasks().filter((t) => t.column_id === col.id)}
                onTaskClick={setSelectedTask}
              />
            ))}

            {/* Add column */}
            {addingColumn ? (
              <div className="flex flex-col w-[200px] flex-shrink-0 rounded-xl overflow-hidden glass p-2 gap-2">
                <input
                  ref={newColInputRef}
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddColumn();
                    if (e.key === 'Escape') { setAddingColumn(false); setNewColName(''); }
                  }}
                  onBlur={handleAddColumn}
                  className="bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.1] rounded-lg px-2.5 py-1.5 text-[12px] text-white/90 outline-none focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/15 transition-all duration-200"
                  placeholder="Название колонки"
                />
                <div className="flex gap-1.5">
                  <button
                    onMouseDown={(e) => { e.preventDefault(); handleAddColumn(); }}
                    className="flex-1 py-1 rounded-lg text-[11px] text-white/70 bg-white/[0.06] hover:bg-white/[0.10] transition-colors"
                  >
                    Добавить
                  </button>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); setAddingColumn(false); setNewColName(''); }}
                    className="px-2 py-1 rounded-lg text-[11px] text-white/35 hover:text-white/60 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingColumn(true)}
                className="flex items-center gap-2 w-[48px] h-[42px] flex-shrink-0 rounded-xl glass border border-white/[0.06] text-white/30 hover:text-white/60 hover:border-white/15 transition-all duration-200 justify-center group"
                title="Добавить колонку"
              >
                <Plus size={16} className="group-hover:scale-110 transition-transform" />
              </button>
            )}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} isDragOverlay />
          ) : activeColumn ? (
            <Column column={activeColumn} tasks={tasks.filter((t) => t.column_id === activeColumn.id)} isDragOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      <DropZone />

      <TaskDetail
        task={selectedTask}
        isOpen={selectedTask !== null}
        onClose={() => setSelectedTask(null)}
      />
    </>
  );
}
