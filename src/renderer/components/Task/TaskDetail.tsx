import React, { useState, useEffect, useRef } from 'react';
import type { Task } from '@shared/types';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@shared/constants';
import { useTaskStore } from '../../stores/taskStore';
import { useColumnStore } from '../../stores/columnStore';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { Trash2, FileText, Folder, Mail, Hand, Clock, CalendarDays } from 'lucide-react';

interface Props {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

const SOURCE_ICON: Record<string, React.ReactNode> = {
  manual: <Hand size={12} />,
  text: <FileText size={12} />,
  file: <Folder size={12} />,
  email: <Mail size={12} />,
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
  const { updateTask, deleteTask } = useTaskStore();
  const { columns } = useColumnStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [columnId, setColumnId] = useState('');
  const [priority, setPriority] = useState<0 | 1 | 2 | 3>(0);
  const [dueDate, setDueDate] = useState<string>('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setColumnId(task.column_id);
      setPriority(task.priority ?? 0);
      // due_date stored as ISO date string "YYYY-MM-DD" or null
      setDueDate(task.due_date ? task.due_date.slice(0, 10) : '');
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

  const handleDueDateChange = (val: string) => {
    setDueDate(val);
    updateTask(task.id, { due_date: val || null });
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
      <div className="flex flex-col gap-5">
        {/* Title */}
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => { if (e.key === 'Enter') titleRef.current?.blur(); }}
          className="text-lg font-semibold text-white/90 bg-transparent border-b border-transparent hover:border-white/[0.08] focus:border-accent-blue/50 outline-none pb-1.5 transition-all duration-200 w-full tracking-tight"
          placeholder="Заголовок задачи"
        />

        {/* Description */}
        <div>
          <label className="text-[11px] font-medium text-white/35 uppercase tracking-wider block mb-2">
            Описание
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription}
            rows={4}
            placeholder="Нет описания"
            className="w-full bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.08] focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/15 rounded-lg px-3 py-2.5 text-[13px] text-white/75 placeholder-white/15 outline-none resize-none transition-all duration-200"
          />
        </div>

        {/* Column + Priority row */}
        <div className="flex gap-4">
          {/* Column */}
          <div className="flex-1">
            <label className="text-[11px] font-medium text-white/35 uppercase tracking-wider block mb-2">
              Колонка
            </label>
            <select
              value={columnId}
              onChange={(e) => handleColumnChange(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.1] focus:border-accent-blue/50 outline-none rounded-lg px-3 py-2 text-[13px] text-white/75 transition-all duration-200"
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
            <label className="text-[11px] font-medium text-white/35 uppercase tracking-wider block mb-2">
              Приоритет
            </label>
            <div className="flex gap-1">
              {([0, 1, 2, 3] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePriorityChange(p)}
                  title={PRIORITY_LABELS[p]}
                  className={`w-8 h-8 rounded-lg text-[11px] font-bold transition-all duration-200 border ${
                    priority === p
                      ? 'border-current scale-[1.05]'
                      : 'border-white/[0.06] opacity-30 hover:opacity-60 hover:border-white/[0.1]'
                  }`}
                  style={{
                    color: p === 0 ? '#6B7280' : PRIORITY_COLORS[p],
                    boxShadow: priority === p && p > 0 ? `0 0 10px ${PRIORITY_COLORS[p]}15` : 'none',
                  }}
                >
                  {p === 0 ? '—' : p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Due date */}
        <div>
          <label className="text-[11px] font-medium text-white/35 uppercase tracking-wider block mb-2">
            Дедлайн
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => handleDueDateChange(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.1] focus:border-accent-blue/50 outline-none rounded-lg px-3 py-2 text-[13px] text-white/75 transition-all duration-200 [color-scheme:dark]"
            />
            {dueDate && (
              <button
                onClick={() => handleDueDateChange('')}
                className="text-white/25 hover:text-white/50 transition-colors text-[11px]"
              >
                Очистить
              </button>
            )}
          </div>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/25 pt-2 border-t border-white/[0.04]">
          <span className="flex items-center gap-1.5 bg-white/[0.03] px-2 py-1 rounded-md">
            {SOURCE_ICON[task.source_type ?? 'manual']}
            {SOURCE_LABEL[task.source_type ?? 'manual']}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays size={11} className="opacity-50" />
            {formatDate(task.created_at)}
          </span>
          {task.updated_at !== task.created_at && (
            <span className="flex items-center gap-1.5">
              <Clock size={11} className="opacity-50" />
              {formatDate(task.updated_at)}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-1">
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 size={12} />}
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
