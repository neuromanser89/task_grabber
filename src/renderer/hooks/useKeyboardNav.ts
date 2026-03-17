import { useEffect, useCallback } from 'react';
import type { Column, TaskWithAttachments } from '@shared/types';

interface UseKeyboardNavOptions {
  columns: Column[];
  tasks: TaskWithAttachments[];
  selectedColumnIndex: number;
  selectedTaskIndex: number;
  onSelectColumn: (idx: number) => void;
  onSelectTask: (idx: number) => void;
  onOpenTask: (task: TaskWithAttachments) => void;
  onCreateTask: () => void;
  onDeleteTask: (task: TaskWithAttachments) => void;
  onMoveTaskToColumn: (task: TaskWithAttachments, columnIndex: number) => void;
  onFocusSearch: () => void;
  enabled: boolean;
}

export function useKeyboardNav({
  columns,
  tasks,
  selectedColumnIndex,
  selectedTaskIndex,
  onSelectColumn,
  onSelectTask,
  onOpenTask,
  onCreateTask,
  onDeleteTask,
  onMoveTaskToColumn,
  onFocusSearch,
  enabled,
}: UseKeyboardNavOptions) {
  const getTasksForColumn = useCallback(
    (colIdx: number) => {
      if (colIdx < 0 || colIdx >= columns.length) return [];
      return tasks
        .filter((t) => t.column_id === columns[colIdx].id)
        .sort((a, b) => a.sort_order - b.sort_order);
    },
    [columns, tasks]
  );

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept if focus is in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const colCount = columns.length;
      if (colCount === 0) return;

      const colTasks = getTasksForColumn(selectedColumnIndex);

      switch (e.key) {
        case 'ArrowLeft': {
          e.preventDefault();
          const newCol = Math.max(0, selectedColumnIndex - 1);
          onSelectColumn(newCol);
          onSelectTask(0);
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          const newCol = Math.min(colCount - 1, selectedColumnIndex + 1);
          onSelectColumn(newCol);
          onSelectTask(0);
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const newIdx = Math.max(0, selectedTaskIndex - 1);
          onSelectTask(newIdx);
          break;
        }
        case 'ArrowDown': {
          e.preventDefault();
          const newIdx = Math.min(colTasks.length - 1, selectedTaskIndex + 1);
          onSelectTask(newIdx);
          break;
        }
        case 'Enter': {
          const task = colTasks[selectedTaskIndex];
          if (task) {
            e.preventDefault();
            onOpenTask(task);
          }
          break;
        }
        case 'n':
        case 'N': {
          e.preventDefault();
          onCreateTask();
          break;
        }
        case '/': {
          e.preventDefault();
          onFocusSearch();
          break;
        }
        case 'Delete': {
          const task = colTasks[selectedTaskIndex];
          if (task) {
            e.preventDefault();
            onDeleteTask(task);
          }
          break;
        }
        default: {
          // 1–9: move to column by number
          const num = parseInt(e.key, 10);
          if (num >= 1 && num <= 9) {
            const targetColIdx = num - 1;
            if (targetColIdx < colCount) {
              const task = colTasks[selectedTaskIndex];
              if (task) {
                e.preventDefault();
                onMoveTaskToColumn(task, targetColIdx);
              }
            }
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    enabled,
    columns,
    tasks,
    selectedColumnIndex,
    selectedTaskIndex,
    getTasksForColumn,
    onSelectColumn,
    onSelectTask,
    onOpenTask,
    onCreateTask,
    onDeleteTask,
    onMoveTaskToColumn,
    onFocusSearch,
  ]);
}
