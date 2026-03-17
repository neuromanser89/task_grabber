import React, { useState, useRef } from 'react';
import { Mail, Paperclip } from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import type { TaskWithAttachments } from '@shared/types';


interface Props {
  onTaskCreated?: (task: TaskWithAttachments) => void;
}

export default function DropZone({ onTaskCreated }: Props) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const dragCounter = useRef(0);
  const { addTaskToStore } = useTaskStore();

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current++;
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    setIsProcessing(true);
    try {
      for (const file of files) {
        const filePath = (file as File & { path?: string }).path;
        if (!filePath) continue;

        if (file.name.toLowerCase().endsWith('.msg')) {
          // Parse .msg — creates task automatically
          const task = await window.electronAPI?.parseMsg(filePath);
          if (task) {
            addTaskToStore(task);
            onTaskCreated?.(task);
          }
        } else {
          // Regular file — create task with file as attachment
          const columns = await window.electronAPI?.getColumns() ?? [];
          const defaultCol = columns.find((c: { is_default: number }) => c.is_default === 1) ?? columns[0];
          if (!defaultCol) continue;

          const tasks = await window.electronAPI?.getTasks() ?? [];
          const colTasks = tasks.filter((t: { column_id: string }) => t.column_id === defaultCol.id);
          const maxOrder = colTasks.length > 0
            ? Math.max(...colTasks.map((t: { sort_order: number }) => t.sort_order)) + 1
            : 0;

          const task = await window.electronAPI?.createTask({
            title: file.name,
            description: null,
            column_id: defaultCol.id,
            sort_order: maxOrder,
            priority: 0,
            color: null,
            source_type: 'file',
            source_info: JSON.stringify({ filename: file.name, path: filePath }),
            due_date: null,
          });

          if (task) {
            const attachment = await window.electronAPI?.addAttachment(task.id, filePath);
            const fullTask: TaskWithAttachments = {
              ...task,
              attachments: attachment ? [attachment] : [],
              tags: [],
            };
            addTaskToStore(fullTask);
            onTaskCreated?.(fullTask);
          }
        }
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`
        mx-4 mb-4 rounded-xl border-2 border-dashed transition-all duration-300 cursor-default
        flex items-center justify-center gap-3 py-3 px-4
        ${isDragOver
          ? 'border-accent-blue/60 bg-accent-blue/[0.06] scale-[1.01] shadow-glow-blue'
          : 'border-white/[0.07] bg-white/[0.015] hover:border-white/[0.12] hover:bg-white/[0.025]'
        }
        ${isProcessing ? 'opacity-60 pointer-events-none' : ''}
      `}
    >
      <div className="flex items-center gap-2 text-white/30">
        <Mail size={14} className={isDragOver ? 'text-accent-blue/70' : ''} />
        <Paperclip size={13} className={isDragOver ? 'text-accent-blue/60' : ''} />
      </div>
      <p className={`text-[11px] transition-colors duration-200 ${isDragOver ? 'text-accent-blue/80' : 'text-white/25'}`}>
        {isProcessing
          ? 'Обработка...'
          : isDragOver
          ? 'Отпустите для создания задачи'
          : 'Перетащите файлы или .msg письма сюда'
        }
      </p>
    </div>
  );
}
