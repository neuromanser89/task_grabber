import React, { useEffect, useRef, useState } from 'react';
import type { Column, TaskWithAttachments } from '@shared/types';
import { PRIORITY_COLORS } from '@shared/constants';
import { X, GripHorizontal } from 'lucide-react';

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins}м`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}ч`;
  return `${Math.floor(hrs / 24)}д`;
}

export default function Widget() {
  const [tasks, setTasks] = useState<TaskWithAttachments[]>([]);
  const [inWorkColumnId, setInWorkColumnId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);

  async function loadTasks() {
    const [allTasks, columns] = await Promise.all([
      window.electronAPI?.getTasks() ?? [],
      window.electronAPI?.getColumns() ?? [],
    ]);
    const sortedCols = [...(columns as Column[])].sort((a, b) => a.sort_order - b.sort_order);
    // Second column (index 1) is typically "В работе", fallback to first non-default
    const inWork = sortedCols[1] ?? sortedCols.find((c) => !c.is_default) ?? sortedCols[0];
    setInWorkColumnId(inWork?.id ?? null);
    setTasks(allTasks as TaskWithAttachments[]);
  }

  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 5000);
    return () => clearInterval(interval);
  }, []);

  const widgetTasks = inWorkColumnId
    ? tasks
        .filter((t) => t.column_id === inWorkColumnId)
        .sort((a, b) => a.sort_order - b.sort_order)
    : [];

  function handleTaskClick(task: TaskWithAttachments) {
    window.electronAPI?.ipcSend('widget:openTask', task.id);
  }

  useEffect(() => {
    function onDragEnter(e: DragEvent) {
      e.preventDefault();
      dragCounter.current++;
      setIsDragOver(true);
    }
    function onDragLeave(e: DragEvent) {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current <= 0) {
        dragCounter.current = 0;
        setIsDragOver(false);
      }
    }
    function onDragOver(e: DragEvent) {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    }
    async function onDrop(e: DragEvent) {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer?.files ?? []);
      const columns = (await window.electronAPI?.getColumns() ?? []) as Column[];
      const inWork = columns.find((c) => c.name === 'В работе' || c.sort_order === 1) ?? columns[0];
      if (!inWork) return;

      for (const file of files) {
        const filePath = window.electronAPI?.getFilePath(file);
        if (!filePath) continue;

        if (file.name.toLowerCase().endsWith('.msg')) {
          await window.electronAPI?.parseMsg(filePath);
        } else {
          const allTasks = (await window.electronAPI?.getTasks() ?? []) as TaskWithAttachments[];
          const colTasks = allTasks.filter((t) => t.column_id === inWork.id);
          const maxOrder = colTasks.length > 0
            ? Math.max(...colTasks.map((t) => t.sort_order)) + 1
            : 0;
          const task = await window.electronAPI?.createTask({
            title: file.name,
            description: null,
            column_id: inWork.id,
            sort_order: maxOrder,
            priority: 0,
            color: null,
            source_type: 'file',
            source_info: JSON.stringify({ filename: file.name, path: filePath }),
            due_date: null,
          });
          if (task) {
            await window.electronAPI?.addAttachment(task.id, filePath);
          }
        }
      }

      loadTasks();
    }

    document.addEventListener('dragenter', onDragEnter);
    document.addEventListener('dragleave', onDragLeave);
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('dragenter', onDragEnter);
      document.removeEventListener('dragleave', onDragLeave);
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('drop', onDrop);
    };
  }, []);

  function closeWidget() {
    window.electronAPI?.closeWindow();
  }

  return (
    <div className="relative flex flex-col h-screen bg-[#0F0F14]/95 backdrop-blur-xl text-white rounded-xl overflow-hidden border border-t-08 select-none">
      {/* Title bar (draggable) */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-t-06 flex-shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal size={12} className="text-t-25" />
          <span className="text-[11px] font-medium text-t-50">В работе</span>
          <span className="text-[10px] text-t-25 bg-t-05 px-1.5 py-0.5 rounded-md tabular-nums">
            {widgetTasks.length}
          </span>
        </div>
        <button
          onClick={closeWidget}
          className="w-5 h-5 flex items-center justify-center rounded text-t-20 hover:text-t-60 hover:bg-t-06 transition-all"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <X size={10} />
        </button>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
        {widgetTasks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-8">
            <span className="text-[11px] text-t-15 italic">Нет задач в работе</span>
          </div>
        ) : (
          widgetTasks.map((task) => (
            <button
              key={task.id}
              onClick={() => handleTaskClick(task)}
              className="w-full text-left rounded-lg px-3 py-2 bg-t-03 hover:bg-t-08 border border-t-06 hover:border-t-10 transition-all duration-150 group"
            >
              <div className="flex items-start gap-2">
                {task.priority > 0 && (
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
                    style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
                  />
                )}
                <p className="text-[12px] font-medium text-t-75 leading-snug line-clamp-2 flex-1 group-hover:text-t-90 transition-colors">
                  {task.title}
                </p>
                <span className="text-[9px] text-t-20 flex-shrink-0 mt-0.5">
                  {relativeTime(task.created_at)}
                </span>
              </div>
              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {task.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-block px-1 py-px rounded text-[9px] font-medium"
                      style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))
        )}
      </div>

      {/* Drop zone overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-accent-blue/10 border-2 border-accent-blue/50 border-dashed">
          <p className="text-sm text-accent-blue/80 font-medium">Создать задачу</p>
        </div>
      )}
    </div>
  );
}
