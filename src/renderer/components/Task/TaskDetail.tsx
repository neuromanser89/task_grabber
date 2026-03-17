import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Tag, TaskWithAttachments } from '@shared/types';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@shared/constants';
import { useTaskStore } from '../../stores/taskStore';
import { useColumnStore } from '../../stores/columnStore';
import Modal from '../common/Modal';
import Button from '../common/Button';
import TagInput from '../common/TagInput';
import { Trash2, FileText, Folder, Mail, Hand, Clock, CalendarDays, Eye, Edit3 } from 'lucide-react';

interface Props {
  task: TaskWithAttachments | null;
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

function toggleChecklistItem(text: string, index: number): string {
  let count = 0;
  return text.replace(/^(\s*[-*]\s+)\[([ xX])\]/gm, (_match, prefix, state) => {
    if (count === index) {
      count++;
      return `${prefix}[${state.trim() === '' ? 'x' : ' '}]`;
    }
    count++;
    return _match;
  });
}

function countChecklist(text: string): [number, number] {
  const matches = text.match(/^[-*]\s+\[([ xX])\]/gm) ?? [];
  const done = matches.filter((m) => /\[([xX])\]/.test(m)).length;
  return [done, matches.length];
}

export default function TaskDetail({ task, isOpen, onClose }: Props) {
  const { updateTask, deleteTask, updateTaskTags } = useTaskStore();
  const { columns } = useColumnStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [columnId, setColumnId] = useState('');
  const [priority, setPriority] = useState<0 | 1 | 2 | 3>(0);
  const [dueDate, setDueDate] = useState<string>('');
  const [taskTags, setTaskTags] = useState<Tag[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [descPreview, setDescPreview] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const checkboxIndexRef = useRef(0);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setColumnId(task.column_id);
      setPriority(task.priority ?? 0);
      setDueDate(task.due_date ? task.due_date.slice(0, 10) : '');
      setTaskTags(task.tags ?? []);
      setConfirmDelete(false);
      setDescPreview(!!(task.description));
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

  const saveDescription = (val?: string) => {
    const text = (val ?? description).trim();
    if (text !== (task.description ?? '')) {
      updateTask(task.id, { description: text || null });
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

  const handleCheckboxToggle = (index: number) => {
    const newText = toggleChecklistItem(description, index);
    setDescription(newText);
    saveDescription(newText);
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deleteTask(task.id);
    onClose();
  };

  const [doneCount, totalCount] = countChecklist(description);

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

        {/* Description with Markdown + Checklist */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-medium text-white/35 uppercase tracking-wider">
              Описание
              {totalCount > 0 && (
                <span className="ml-2 normal-case font-normal text-white/25">
                  {doneCount}/{totalCount}
                </span>
              )}
            </label>
            <button
              onClick={() => {
                if (descPreview) {
                  setDescPreview(false);
                } else {
                  saveDescription();
                  setDescPreview(true);
                }
              }}
              className="flex items-center gap-1 text-[11px] text-white/25 hover:text-white/50 transition-colors"
            >
              {descPreview ? <Edit3 size={11} /> : <Eye size={11} />}
              {descPreview ? 'Редактировать' : 'Предпросмотр'}
            </button>
          </div>

          {descPreview ? (
            <div
              className="min-h-[96px] w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-[13px] text-white/75 leading-relaxed cursor-text"
              onClick={() => setDescPreview(false)}
            >
              {description ? (
                (() => {
                  checkboxIndexRef.current = 0;
                  return (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        li: ({ children, ...props }) => {
                          const childArr = React.Children.toArray(children);
                          const first = childArr[0] as React.ReactElement | undefined;
                          if (first && typeof first === 'object' && (first as React.ReactElement).type === 'input') {
                            return <li className="flex items-start gap-2 list-none -ml-4" {...props}>{children}</li>;
                          }
                          return <li className="ml-1" {...props}>{children}</li>;
                        },
                        input: ({ checked }) => {
                          const idx = checkboxIndexRef.current++;
                          return (
                            <input
                              type="checkbox"
                              checked={checked ?? false}
                              onChange={(e) => { e.stopPropagation(); handleCheckboxToggle(idx); }}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-0.5 accent-blue-500 cursor-pointer flex-shrink-0"
                            />
                          );
                        },
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        h1: ({ children }) => <h1 className="text-[15px] font-bold text-white/85 mb-2">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-[13px] font-bold text-white/80 mb-1.5">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-[12px] font-semibold text-white/75 mb-1">{children}</h3>,
                        ul: ({ children }) => <ul className="mb-2 space-y-1 pl-4">{children}</ul>,
                        ol: ({ children }) => <ol className="mb-2 space-y-1 list-decimal pl-4">{children}</ol>,
                        code: ({ children, className }) => {
                          const isBlock = className?.includes('language-');
                          return isBlock
                            ? <code className="block bg-white/[0.05] rounded px-2 py-1.5 text-[11px] font-mono text-white/60 mb-2 overflow-x-auto">{children}</code>
                            : <code className="bg-white/[0.07] rounded px-1 py-0.5 text-[11px] font-mono text-white/65">{children}</code>;
                        },
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-2 border-white/20 pl-3 text-white/45 italic mb-2">{children}</blockquote>
                        ),
                        a: ({ children, href }) => (
                          <a href={href} className="text-blue-400/80 underline hover:text-blue-400" target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{children}</a>
                        ),
                        strong: ({ children }) => <strong className="font-semibold text-white/85">{children}</strong>,
                        em: ({ children }) => <em className="text-white/60 italic">{children}</em>,
                      }}
                    >
                      {description}
                    </ReactMarkdown>
                  );
                })()
              ) : (
                <span className="text-white/15">Нет описания. Нажмите чтобы добавить...</span>
              )}
            </div>
          ) : (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => { saveDescription(); if (description.trim()) setDescPreview(true); }}
              rows={6}
              placeholder={"Описание... (Markdown)\n\n- [ ] подзадача 1\n- [x] выполнено\n\n**жирный**, *курсив*, # заголовок"}
              className="w-full bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.08] focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/15 rounded-lg px-3 py-2.5 text-[13px] text-white/75 placeholder-white/15 outline-none resize-none transition-all duration-200 font-mono"
            />
          )}
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

        {/* Tags */}
        <div>
          <label className="text-[11px] font-medium text-white/35 uppercase tracking-wider block mb-2">
            Теги
          </label>
          <TagInput
            taskId={task.id}
            initialTags={taskTags}
            onChange={(tags) => {
              setTaskTags(tags);
              updateTaskTags(task.id, tags);
            }}
          />
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
