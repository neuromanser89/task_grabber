import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useKeyboardNav } from '../../hooks/useKeyboardNav';

const RANDOM_COLORS = [
  '#3B82F6', '#F59E0B', '#8B5CF6', '#10B981',
  '#EF4444', '#EC4899', '#14B8A6', '#F97316',
];

interface Props {
  onCreateTask?: () => void;
  onFocusSearch?: () => void;
}

export default function KanbanBoard({ onCreateTask, onFocusSearch }: Props) {
  const { tasks, fetchAll, moveTask, filteredTasks, deleteTask } = useTaskStore();
  const { columns, fetchColumns, createColumn, reorderColumns } = useColumnStore();

  const [activeTask, setActiveTask] = useState<TaskWithAttachments | null>(null);
  const [activeColumn, setActiveColumn] = useState<ColumnType | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskWithAttachments | null>(null);

  // Keyboard nav state
  const [selectedColumnIndex, setSelectedColumnIndex] = useState(0);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<TaskWithAttachments | null>(null);

  // Inline new column state
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColName, setNewColName] = useState('');
  const newColInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAll();
    fetchColumns();
  }, [fetchAll, fetchColumns]);

  // Open task from reminder notification, widget click, or command palette
  useEffect(() => {
    const unsubReminder = window.electronAPI?.onReminderShow((taskId) => {
      const task = useTaskStore.getState().tasks.find((t) => t.id === taskId);
      if (task) setSelectedTask(task);
    });
    const unsubWidget = window.electronAPI?.onWidgetOpenTask?.((taskId) => {
      const task = useTaskStore.getState().tasks.find((t) => t.id === taskId);
      if (task) setSelectedTask(task);
    });
    const handleBoardOpenTask = (e: Event) => {
      const taskId = (e as CustomEvent<string>).detail;
      const task = useTaskStore.getState().tasks.find((t) => t.id === taskId);
      if (task) setSelectedTask(task);
    };
    window.addEventListener('board:openTask', handleBoardOpenTask);
    return () => {
      unsubReminder?.();
      unsubWidget?.();
      window.removeEventListener('board:openTask', handleBoardOpenTask);
    };
  }, []);

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

  // Get currently selected task ID for highlighting
  const selectedTaskId = (() => {
    if (selectedColumnIndex < 0 || selectedColumnIndex >= sortedColumns.length) return null;
    const col = sortedColumns[selectedColumnIndex];
    const colTasks = tasks
      .filter((t) => t.column_id === col.id)
      .sort((a, b) => a.sort_order - b.sort_order);
    return colTasks[selectedTaskIndex]?.id ?? null;
  })();

  // Keyboard nav handlers
  const handleMoveTaskToColumn = useCallback(
    async (task: TaskWithAttachments, colIdx: number) => {
      if (colIdx < 0 || colIdx >= sortedColumns.length) return;
      const targetCol = sortedColumns[colIdx];
      if (task.column_id === targetCol.id) return;
      const targetTasks = tasks
        .filter((t) => t.column_id === targetCol.id)
        .sort((a, b) => a.sort_order - b.sort_order);
      const newOrder = targetTasks.length > 0
        ? targetTasks[targetTasks.length - 1].sort_order + 1
        : 0;
      await moveTask(task.id, targetCol.id, newOrder);
      setSelectedColumnIndex(colIdx);
      setSelectedTaskIndex(0);
    },
    [sortedColumns, tasks, moveTask]
  );

  const handleDeleteTask = useCallback((task: TaskWithAttachments) => {
    setDeleteConfirm(task);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    await deleteTask(deleteConfirm.id);
    setDeleteConfirm(null);
    setSelectedTaskIndex(0);
  }, [deleteConfirm, deleteTask]);

  useKeyboardNav({
    columns: sortedColumns,
    tasks,
    selectedColumnIndex,
    selectedTaskIndex,
    onSelectColumn: setSelectedColumnIndex,
    onSelectTask: setSelectedTaskIndex,
    onOpenTask: setSelectedTask,
    onCreateTask: onCreateTask ?? (() => {}),
    onDeleteTask: handleDeleteTask,
    onMoveTaskToColumn: handleMoveTaskToColumn,
    onFocusSearch: onFocusSearch ?? (() => {}),
    enabled: selectedTask === null && deleteConfirm === null && !addingColumn,
  });

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

    if (isDndColumnId(activeId)) return;

    const draggedTask = tasks.find((t) => t.id === activeId);
    if (!draggedTask) return;

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

            {sortedColumns.map((col, colIdx) => (
              <Column
                key={col.id}
                column={col}
                tasks={filteredTasks().filter((t) => t.column_id === col.id)}
                onTaskClick={setSelectedTask}
                selectedTaskId={selectedColumnIndex === colIdx ? selectedTaskId : null}
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

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-heavy rounded-xl p-6 max-w-sm w-full mx-4 border border-white/[0.08] shadow-2xl">
            <p className="text-white/80 text-sm mb-1">Удалить задачу?</p>
            <p className="text-white/40 text-xs mb-4 line-clamp-2">{deleteConfirm.title}</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/70 bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-1.5 rounded-lg text-xs text-white bg-red-500/80 hover:bg-red-500 transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
