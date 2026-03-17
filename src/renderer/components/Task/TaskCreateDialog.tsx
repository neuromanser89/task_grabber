import React, { useState, useEffect } from 'react';
import { Plus, Upload } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import { useTaskStore } from '../../stores/taskStore';
import { PRIORITY_LABELS, PRIORITY_COLORS } from '@shared/constants';
import type { Priority } from '@shared/types';

interface TaskCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialText?: string;
  initialFiles?: string[];
}

export default function TaskCreateDialog({
  isOpen,
  onClose,
  initialText = '',
  initialFiles = [],
}: TaskCreateDialogProps) {
  const { tasks, columns, createTask } = useTaskStore();

  const defaultColumn = columns.find(c => c.is_default === 1) ?? columns[0];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [columnId, setColumnId] = useState('');
  const [priority, setPriority] = useState<Priority>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset state when dialog opens
  useEffect(() => {
    if (!isOpen) return;
    const firstLine = initialText ? initialText.split('\n')[0].trim() : '';
    setTitle(firstLine.slice(0, 120));
    setDescription(initialText);
    setColumnId(defaultColumn?.id ?? '');
    setPriority(0);
    setError('');
  }, [isOpen, initialText, defaultColumn?.id]);

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('Заголовок обязателен');
      return;
    }
    if (!columnId) {
      setError('Выберите колонку');
      return;
    }
    setLoading(true);
    try {
      const maxOrder = tasks
        .filter(t => t.column_id === columnId)
        .reduce((max, t) => Math.max(max, t.sort_order), -1);

      await createTask({
        title: title.trim(),
        description: description.trim() || null,
        column_id: columnId,
        sort_order: maxOrder + 1,
        priority,
        color: null,
        source_type: initialText ? 'text' : 'manual',
        source_info: null,
      });
      onClose();
    } catch {
      setError('Ошибка при создании задачи');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleCreate();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="✨ Новая задача" size="md">
      <div className="flex flex-col gap-4" onKeyDown={handleKeyDown}>
        <Input
          label="Заголовок"
          placeholder="Название задачи..."
          value={title}
          onChange={v => { setTitle(v); setError(''); }}
          autoFocus
          error={error && !title.trim() ? error : undefined}
        />

        <Input
          label="Описание"
          placeholder="Подробности, ссылки, заметки..."
          value={description}
          onChange={setDescription}
          multiline
          rows={4}
        />

        {/* Column selector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-white/50 uppercase tracking-wide">
            Колонка
          </label>
          <select
            value={columnId}
            onChange={e => setColumnId(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-colors"
          >
            {columns.map(col => (
              <option key={col.id} value={col.id} className="bg-[#1A1A2E]">
                {col.name}
              </option>
            ))}
          </select>
        </div>

        {/* Priority selector */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-white/50 uppercase tracking-wide">
            Приоритет
          </label>
          <div className="flex gap-2">
            {([0, 1, 2, 3] as Priority[]).map(p => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  priority === p
                    ? 'border-transparent'
                    : 'border-white/10 text-white/40 hover:text-white/60 hover:border-white/20'
                }`}
                style={
                  priority === p
                    ? {
                        backgroundColor: p === 0 ? 'rgba(255,255,255,0.1)' : `${PRIORITY_COLORS[p]}25`,
                        color: p === 0 ? 'rgba(255,255,255,0.7)' : PRIORITY_COLORS[p],
                        borderColor: p === 0 ? 'rgba(255,255,255,0.15)' : `${PRIORITY_COLORS[p]}50`,
                      }
                    : {}
                }
              >
                {PRIORITY_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Files hint */}
        {initialFiles.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg">
            <Upload size={14} className="text-white/40 flex-shrink-0" />
            <span className="text-xs text-white/50">
              {initialFiles.length} файл{initialFiles.length > 1 ? 'а' : ''} будет прикреплено
            </span>
          </div>
        )}

        {error && title.trim() && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Отмена
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            loading={loading}
            icon={<Plus size={14} />}
          >
            Создать
          </Button>
        </div>
      </div>
    </Modal>
  );
}
