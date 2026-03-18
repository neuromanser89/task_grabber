import React, { useState, useRef, useEffect } from 'react';
import { Mail, Paperclip, Plus } from 'lucide-react';
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

  // Listen for drag events on the entire window
  useEffect(() => {
    function hasDraggableContent(e: DragEvent): boolean {
      const types = e.dataTransfer?.types ?? [];
      return types.includes('Files') || types.includes('text/plain') || types.includes('text/uri-list');
    }

    function handleWindowDragEnter(e: DragEvent) {
      e.preventDefault();
      if (hasDraggableContent(e)) {
        dragCounter.current++;
        setIsDragOver(true);
      }
    }

    function handleWindowDragLeave(e: DragEvent) {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current <= 0) {
        dragCounter.current = 0;
        setIsDragOver(false);
      }
    }

    function handleWindowDragOver(e: DragEvent) {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    }

    async function handleWindowDrop(e: DragEvent) {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragOver(false);

      // Handle browser text/URL drags
      const textData = e.dataTransfer?.getData('text/uri-list') || e.dataTransfer?.getData('text/plain');
      const files = Array.from(e.dataTransfer?.files ?? []);

      if (files.length === 0 && textData) {
        // Text or URL drag from browser
        const columns = await window.electronAPI?.getColumns() ?? [];
        const defaultCol = (columns as { id: string; is_default: number }[]).find((c) => c.is_default === 1) ?? columns[0];
        if (!defaultCol) return;

        const allTasks = await window.electronAPI?.getTasks() ?? [];
        const colTasks = (allTasks as { column_id: string; sort_order: number }[]).filter((t) => t.column_id === (defaultCol as { id: string }).id);
        const maxOrder = colTasks.length > 0
          ? Math.max(...colTasks.map((t) => t.sort_order)) + 1
          : 0;

        const firstLine = textData.split('\n')[0].trim().slice(0, 120);
        const task = await window.electronAPI?.createTask({
          title: firstLine || 'Новая задача',
          description: textData,
          column_id: (defaultCol as { id: string }).id,
          sort_order: maxOrder,
          priority: 0,
          color: null,
          source_type: 'text',
          source_info: null,
          due_date: null,
        });
        if (task) {
          const fullTask: TaskWithAttachments = { ...task, attachments: [], tags: [] };
          addTaskToStore(fullTask);
          onTaskCreated?.(fullTask);
        }
        return;
      }

      if (files.length === 0) return;

      setIsProcessing(true);
      try {
        // Fetch columns and tasks once before the loop to avoid N+1 IPC calls
        const columns = await window.electronAPI?.getColumns() ?? [];
        const defaultCol = columns.find((c: { is_default: number }) => c.is_default === 1) ?? columns[0];
        let currentTasks = await window.electronAPI?.getTasks() ?? [];

        for (const file of files) {
          const filePath = window.electronAPI?.getFilePath(file);
          if (!filePath) continue;

          if (file.name.toLowerCase().endsWith('.msg')) {
            const task = await window.electronAPI?.parseMsg(filePath);
            if (task) {
              addTaskToStore(task);
              onTaskCreated?.(task);
            }
          } else {
            if (!defaultCol) continue;

            const colTasks = currentTasks.filter((t: { column_id: string }) => t.column_id === defaultCol.id);
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
              // Update local tasks list so next iteration has correct sort_order
              currentTasks = [...currentTasks, fullTask as any];
            }
          }
        }
      } finally {
        setIsProcessing(false);
      }
    }

    document.addEventListener('dragenter', handleWindowDragEnter);
    document.addEventListener('dragleave', handleWindowDragLeave);
    document.addEventListener('dragover', handleWindowDragOver);
    document.addEventListener('drop', handleWindowDrop);

    return () => {
      document.removeEventListener('dragenter', handleWindowDragEnter);
      document.removeEventListener('dragleave', handleWindowDragLeave);
      document.removeEventListener('dragover', handleWindowDragOver);
      document.removeEventListener('drop', handleWindowDrop);
    };
  }, [addTaskToStore, onTaskCreated]);

  // Full-screen overlay — only visible when dragging files
  if (!isDragOver && !isProcessing) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-col items-center gap-4 p-12 rounded-2xl glass-heavy border border-accent-blue/20 shadow-glow-blue animate-fade-in-scale">
        <div className="flex items-center gap-3 text-accent-blue/80">
          <Mail size={28} />
          <Paperclip size={24} />
          <Plus size={24} />
        </div>
        <p className="text-lg font-medium text-t-80">
          {isProcessing
            ? 'Создаём задачу...'
            : 'Отпустите файлы для создания задачи'
          }
        </p>
        <p className="text-sm text-t-40">
          .msg письма • документы • файлы • текст • URL
        </p>
      </div>
    </div>
  );
}
