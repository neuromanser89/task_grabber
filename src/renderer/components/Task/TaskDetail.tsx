import React, { useState, useEffect, useRef } from 'react';
import type { Task } from '@shared/types';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@shared/constants';
import { useTaskStore } from '../../stores/taskStore';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { Trash2, FileText, Folder, Mail, Hand } from 'lucide-react';

interface Props {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

const SOURCE_ICON: Record<string, React.ReactNode> = {
  manual: <Hand size={14} />,
  text: <FileText size={14} />,
  file: <Folder size={14} />,
  email: <Mail size={14} />,
};

const SOURCE_LABEL: Record<string, string> = {
  manual: 'Вручную',
  text: 'Текст',
  file: 'Файл',
  email: 'Письмо',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TaskDetail({ task, isOpen, onClose }: Props) {
  const { columns, updateTask, deleteTask } = useTaskStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [columnId, setColumnId] = useState('');
  const [priority, setPriority] = useState<0 | 1 | 2 | 3>(0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setColumnId(task.column_id);
      setPriority(task.priority ?? 0);
      setConfirmDelete(false);
    }
  }, [task]);

  if (!task) return null;

  const saveTitle = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== task.title) {
      updateTask(task.id, { title: trimmed });
    } else {
      setTitle(task.title);
    }
  };

  const saveDescription = () => {
    const val = description.trim();
    if (val !== (task.description ?? '')) {
      updateTask(task.id, { description: val || null });
    }
  };

  const handleColumnChange = (newColumnId: string) => {
    setColumnId(newColumnId);
    updateTask(task.id, { column_id: newColumnId });
  };

  const handlePriorityChange = (p: 0 | 1 | 2 | 3) => {
    setPriority(p);
    updateTask(task.id, { priority: p });
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deleteTask(task.id);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="flex flex-col gap-4">
        {/* Title */}
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => { if (e.key === 'Enter') titleRef.current?.blur(); }}
          className="text-lg font-semibold text-white/95 bg-transparent border-b border-transparent hover:border-white/10 focus:border-blue-500/60 outline-none pb-1 transition-colors w-full"
          placeholder="Заголовок задачи"
        />

        {/* Description */}
        <div>
          <label className="text-xs font-medium text-white/40 uppercase tracking-wide block mb-1.5">
            Описание
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription}
            rows={4}
            placeholder="Нет описания"
            className="w-full bg-white/5 border border-white/10 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/20 outline-none resize-none transition-colors"
          />
        </div>

        {/* Column + Priority row */}
        <div className="flex gap-4">
          {/* Column */}
          <div className="flex-1">
            <label className="text-xs font-medium text-white/40 uppercase tracking-wide block mb-1.5">
              Колонка
            </label>
            <select
              value={columnId}
              onChange={(e) => handleColumnChange(e.target.value)}
              className="w-full bg-white/5 border border-white/10 focus:border-blue-500/60 outline-none rounded-lg px-3 py-2 text-sm text-white/80 transition-colors"
            >
              {columns.map((col) => (
                <option key={col.id} value={col.id} style={{ backgroundColor: '#1A1A2E' }}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-medium text-white/40 uppercase tracking-wide block mb-1.5">
              Приоритет
            </label>
            <div className="flex gap-1">
              {([0, 1, 2, 3] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePriorityChange(p)}
                  title={PRIORITY_LABELS[p]}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all border ${
                    priority === p
                      ? 'border-current opacity-100'
                      : 'border-white/10 opacity-40 hover:opacity-70'
                  }`}
                  style={{ color: p === 0 ? '#6B7280' : PRIORITY_COLORS[p] }}
                >
                  {p === 0 ? '—' : p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-4 text-xs text-white/30 pt-1 border-t border-white/5">
          <span className="flex items-center gap-1.5">
            {SOURCE_ICON[task.source_type ?? 'manual']}
            {SOURCE_LABEL[task.source_type ?? 'manual']}
          </span>
          <span>Создано: {formatDate(task.created_at)}</span>
          {task.updated_at !== task.created_at && (
            <span>Изменено: {formatDate(task.updated_at)}</span>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-1">
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 size={13} />}
            onClick={handleDelete}
            onBlur={() => setConfirmDelete(false)}
          >
            {confirmDelete ? 'Точно удалить?' : 'Удалить'}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>
    </Modal>
  );
}
