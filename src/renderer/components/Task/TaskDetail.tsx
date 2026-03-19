import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Tag, TaskWithAttachments, Attachment, TaskUpdate } from '@shared/types';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@shared/constants';
import { useTaskStore } from '../../stores/taskStore';
import { useColumnStore } from '../../stores/columnStore';
import Modal from '../common/Modal';
import Button from '../common/Button';
import TagInput from '../common/TagInput';
import {
  Trash2, FileText, Folder, Mail, Hand, Clock, CalendarDays, CheckCircle2, MessageSquare, Send,
  Eye, Edit3, Bookmark, BookmarkCheck, Paperclip, X, Image, Archive, Bell, BellOff, Timer, Lock, Unlock,
  ChevronDown, ChevronUp, Bot, Loader2,
} from 'lucide-react';
import RelatedTasks from './RelatedTasks';

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

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']);

function isImage(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTS.has(ext);
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

import { toggleChecklistItem, countChecklist } from '../../utils/checklist';

function relativeTimeShort(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'сейчас';
  if (mins < 60) return `${mins}м`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}ч`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'вчера';
  return `${days}д`;
}

function UpdatesSection({ taskId }: { taskId: string }) {
  const [updates, setUpdates] = useState<TaskUpdate[]>([]);
  const [newText, setNewText] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editDate, setEditDate] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    window.electronAPI?.getTaskUpdates?.(taskId).then(setUpdates);
  }, [taskId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    const text = newText.trim();
    if (!text) return;
    await window.electronAPI?.createTaskUpdate?.(taskId, text);
    setNewText('');
    load();
  };

  const handleDelete = async (id: string) => {
    await window.electronAPI?.deleteTaskUpdate?.(id);
    load();
  };

  const startEdit = (u: TaskUpdate) => {
    setEditingId(u.id);
    setEditContent(u.content);
    setEditDate(u.created_at.slice(0, 16));
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await window.electronAPI?.updateTaskUpdate?.(editingId, {
      content: editContent,
      created_at: editDate ? new Date(editDate).toISOString() : undefined,
    });
    setEditingId(null);
    load();
  };

  return (
    <div className="border-t border-t-04 pt-3">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1.5 mb-2 w-full"
      >
        <ChevronDown size={10} className={`text-t-20 transition-transform duration-150 ${collapsed ? '-rotate-90' : ''}`} />
        <MessageSquare size={10} className="text-t-25" />
        <span className="text-[10px] font-medium text-t-30 uppercase tracking-wider">
          Апдейты
        </span>
        {updates.length > 0 && (
          <span className="text-[9px] text-accent-blue tabular-nums ml-1">{updates.length}</span>
        )}
      </button>

      {!collapsed && (
        <>
          {updates.length > 0 && (
            <div className="flex flex-col gap-1.5 mb-2 max-h-48 overflow-y-auto">
              {updates.map((u) => (
                <div key={u.id} className="group/upd flex items-start gap-2 px-2 py-1.5 rounded-md bg-t-03 hover:bg-t-05 transition-colors">
                  {editingId === u.id ? (
                    <div className="flex-1 flex flex-col gap-1.5">
                      <input
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full bg-t-04 border border-t-08 rounded px-2 py-1 text-[11px] text-t-80 outline-none focus:border-accent-blue/40"
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="datetime-local"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="bg-t-04 border border-t-06 rounded px-1.5 py-0.5 text-[10px] text-t-60 outline-none"
                        />
                        <button onClick={saveEdit} className="text-[10px] text-accent-blue hover:underline">Сохранить</button>
                        <button onClick={() => setEditingId(null)} className="text-[10px] text-t-30 hover:text-t-50">Отмена</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-[10px] text-t-25 tabular-nums flex-shrink-0 w-10 pt-0.5" title={formatDate(u.created_at)}>
                        {relativeTimeShort(u.created_at)}
                      </span>
                      <p className="text-[11px] text-t-70 flex-1 leading-relaxed">{u.content}</p>
                      <div className="flex gap-1 opacity-0 group-hover/upd:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={() => startEdit(u)}
                          className="text-t-20 hover:text-t-50 transition-colors"
                          title="Редактировать"
                        >
                          <Edit3 size={10} />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="text-t-20 hover:text-red-400/70 transition-colors"
                          title="Удалить"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="Написать апдейт..."
              className="flex-1 bg-t-04 border border-t-06 hover:border-t-10 focus:border-accent-blue/40 outline-none rounded-lg px-2.5 py-1.5 text-[11px] text-t-75 placeholder-t-20 transition-all"
            />
            <button
              onClick={handleAdd}
              disabled={!newText.trim()}
              className="w-7 h-7 flex items-center justify-center rounded-md text-t-30 hover:text-accent-blue hover:bg-t-06 transition-colors disabled:opacity-30"
              title="Отправить (Enter)"
            >
              <Send size={12} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}


// Attachment item with hover preview for images
function AttachmentItem({ att, onDelete }: { att: Attachment; onDelete: (id: string) => void }) {
  const [showPreview, setShowPreview] = useState(false);
  const img = isImage(att.filename);

  const handleOpen = () => {
    window.electronAPI?.openFile(att.filepath);
  };

  return (
    <div
      className="relative flex items-center gap-2 px-2.5 py-1.5 bg-t-03 border border-t-06 rounded-lg group hover:border-t-12 transition-all duration-150"
      onMouseEnter={() => img && setShowPreview(true)}
      onMouseLeave={() => setShowPreview(false)}
    >
      {/* Image preview tooltip */}
      {showPreview && img && (
        <div className="absolute bottom-full left-0 mb-2 z-50 pointer-events-none">
          <div className="glass-heavy border border-t-12 rounded-lg p-1.5 shadow-2xl">
            <img
              src={`file://${att.filepath.replace(/\\/g, '/')}`}
              alt={att.filename}
              className="max-w-[240px] max-h-[180px] object-contain rounded"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        </div>
      )}

      <span className="text-t-30 flex-shrink-0">
        {img ? <Image size={12} /> : <Paperclip size={12} />}
      </span>

      <button
        onClick={handleOpen}
        className="flex-1 text-left text-[11px] text-t-60 hover:text-t-85 transition-colors truncate max-w-[200px]"
        title={att.filename}
      >
        {att.filename}
      </button>

      {att.filesize && (
        <span className="text-[10px] text-t-20 flex-shrink-0">
          {formatFileSize(att.filesize)}
        </span>
      )}

      <button
        onClick={() => onDelete(att.id)}
        className="opacity-0 group-hover:opacity-100 text-t-25 hover:text-red-400/70 transition-all ml-1 flex-shrink-0"
        title="Удалить вложение"
      >
        <X size={11} />
      </button>
    </div>
  );
}

export default function TaskDetail({ task, isOpen, onClose }: Props) {
  const { updateTask, deleteTask, updateTaskTags, deleteAttachment } = useTaskStore();
  const { columns } = useColumnStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [columnId, setColumnId] = useState('');
  const [priority, setPriority] = useState<0 | 1 | 2 | 3>(0);
  const [dueDate, setDueDate] = useState<string>('');
  const [taskTags, setTaskTags] = useState<Tag[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [descPreview, setDescPreview] = useState(false);
  const [savedTemplate, setSavedTemplate] = useState(false);
  const [reminderAt, setReminderAt] = useState<string>('');
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<string>('');
  const [recurrenceNext, setRecurrenceNext] = useState<string>('');
  const [isConfidential, setIsConfidential] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);

  const titleRef = useRef<HTMLInputElement>(null);

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
      setSavedTemplate(false);
      setReminderAt(task.reminder_at ? task.reminder_at.slice(0, 16) : '');
      setConfirmArchive(false);
      setRecurrenceRule(task.recurrence_rule ?? '');
      setRecurrenceNext(task.recurrence_next ? task.recurrence_next.slice(0, 10) : '');
      setIsConfidential(!!task.is_confidential);
    }
  }, [task]);

  useEffect(() => {
    if (aiConfigured !== null) return;
    Promise.all([
      window.electronAPI?.getSetting('ai_model'),
      window.electronAPI?.getSetting('ai_provider'),
      window.electronAPI?.getSetting('ai_api_key'),
    ]).then(([model, provider, apiKey]) => {
      setAiConfigured(!!model && (provider === 'ollama' || !!apiKey));
    }).catch(() => setAiConfigured(false));
  }, [aiConfigured]);

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

  const handleDeleteAttachment = async (attachmentId: string) => {
    await deleteAttachment(task.id, attachmentId);
  };

  const handleSaveAsTemplate = async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.createTemplate({
      title: title.trim(),
      description: description.trim() || null,
      priority,
      tags: JSON.stringify(taskTags.map((t) => t.name)),
    });
    setSavedTemplate(true);
    setTimeout(() => setSavedTemplate(false), 2000);
  };

  const handleReminderChange = (val: string) => {
    setReminderAt(val);
    updateTask(task.id, { reminder_at: val ? new Date(val).toISOString() : null });
  };

  const handleRecurrenceChange = async (rule: string, next: string) => {
    setRecurrenceRule(rule);
    setRecurrenceNext(next);
    await window.electronAPI?.recurringSetRule?.(task.id, rule || null, next || null);
  };

  const handleConfidentialToggle = () => {
    const next = !isConfidential;
    setIsConfidential(next);
    updateTask(task.id, { is_confidential: next ? 1 : 0 });
  };

  const handleArchive = async () => {
    if (!confirmArchive) {
      setConfirmArchive(true);
      return;
    }
    await window.electronAPI?.archiveTask(task.id);
    // Remove from store (without calling DB delete)
    useTaskStore.setState((s) => ({ tasks: s.tasks.filter((t) => t.id !== task.id) }));
    onClose();
  };

  const handleAIDescription = async () => {
    if (!aiConfigured) return;
    if (title.trim().length < 10) return;
    setAiLoading(true);
    try {
      const [provider, model, apiKey, baseUrl] = await Promise.all([
        window.electronAPI?.getSetting('ai_provider'),
        window.electronAPI?.getSetting('ai_model'),
        window.electronAPI?.getSetting('ai_api_key'),
        window.electronAPI?.getSetting('ai_base_url'),
      ]);
      const prompt = `На основе заголовка задачи '${title.trim()}' и описания '${description.trim()}', создай подробное описание задачи с конкретными шагами выполнения в формате markdown checklist. Кратко, по делу, без воды.`;
      const result = await window.electronAPI?.aiQuery?.({
        provider: (provider as 'openrouter' | 'ollama') || 'openrouter',
        model: (model as string) || 'openai/gpt-4o-mini',
        apiKey: (apiKey as string) || null,
        baseUrl: (baseUrl as string) || 'http://localhost:11434',
        messages: [{ role: 'user', content: prompt }],
      });
      if (result?.content) {
        const newDesc = description ? `${description}\n\n${result.content}` : result.content;
        setDescription(newDesc);
        saveDescription(newDesc);
      }
    } catch {
      // silently ignore
    } finally {
      setAiLoading(false);
    }
  };

  const [doneCount, totalCount] = countChecklist(description);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* Title */}
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => { if (e.key === 'Enter') titleRef.current?.blur(); }}
          className="text-lg font-semibold text-t-90 bg-transparent border-b border-transparent hover:border-t-08 focus:border-accent-blue/50 outline-none pb-1.5 transition-all duration-200 w-full tracking-tight"
          placeholder="Заголовок задачи"
        />

        {/* Description with Markdown + Checklist */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-medium text-t-35 uppercase tracking-wider">
              Описание
              {totalCount > 0 && (
                <span className="ml-2 normal-case font-normal text-t-25">
                  {doneCount}/{totalCount}
                </span>
              )}
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAIDescription}
                disabled={!aiConfigured || aiLoading || title.trim().length < 10}
                title={!aiConfigured ? 'Настройте AI в ⚙' : title.trim().length < 10 ? 'Добавьте больше контекста в заголовок' : 'AI описание по заголовку'}
                className={`flex items-center gap-1 text-[11px] transition-colors ${
                  aiConfigured && title.trim().length >= 10
                    ? 'text-accent-purple/70 hover:text-accent-purple cursor-pointer'
                    : 'text-t-15 cursor-not-allowed'
                }`}
              >
                {aiLoading ? <Loader2 size={11} className="animate-spin" /> : <Bot size={11} />}
                AI
              </button>
              <button
                onClick={() => {
                  if (descPreview) {
                    setDescPreview(false);
                  } else {
                    saveDescription();
                    setDescPreview(true);
                  }
                }}
                className="flex items-center gap-1 text-[11px] text-t-25 hover:text-t-50 transition-colors"
              >
                {descPreview ? <Edit3 size={11} /> : <Eye size={11} />}
                {descPreview ? 'Редактировать' : 'Предпросмотр'}
              </button>
            </div>
          </div>

          {descPreview ? (
            <div
              className="min-h-[96px] w-full bg-t-03 border border-t-06 rounded-lg px-3 py-2.5 text-[13px] text-t-75 leading-relaxed cursor-text"
              onClick={() => setDescPreview(false)}
            >
              {description ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        li: ({ children, node, className: liClass, ...props }) => {
                          const isTask = typeof liClass === 'string' && liClass.includes('task-list-item');
                          if (isTask) {
                            const lineIndex = (node as any)?.position?.start?.line;
                            const childArr = React.Children.toArray(children);
                            const firstChild = childArr[0] as React.ReactElement | undefined;
                            const checked = firstChild && React.isValidElement(firstChild)
                              ? (firstChild.props as any)?.checked ?? false
                              : false;
                            return (
                              <li className="flex items-start gap-2 list-none -ml-4" {...props}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => { e.stopPropagation(); if (lineIndex != null) handleCheckboxToggle(lineIndex - 1); }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="mt-0.5 accent-blue-500 cursor-pointer flex-shrink-0"
                                />
                                {childArr.slice(1)}
                              </li>
                            );
                          }
                          return <li className="ml-1" {...props}>{children}</li>;
                        },
                        input: ({ checked }) => (
                          <input
                            type="checkbox"
                            checked={checked ?? false}
                            readOnly
                            className="mt-0.5 accent-blue-500 cursor-pointer flex-shrink-0"
                          />
                        ),
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        h1: ({ children }) => <h1 className="text-[15px] font-bold text-t-85 mb-2">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-[13px] font-bold text-t-80 mb-1.5">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-[12px] font-semibold text-t-75 mb-1">{children}</h3>,
                        ul: ({ children }) => <ul className="mb-2 space-y-1 pl-4">{children}</ul>,
                        ol: ({ children }) => <ol className="mb-2 space-y-1 list-decimal pl-4">{children}</ol>,
                        code: ({ children, className }) => {
                          const isBlock = className?.includes('language-');
                          return isBlock
                            ? <code className="block bg-t-05 rounded px-2 py-1.5 text-[11px] font-mono text-t-60 mb-2 overflow-x-auto">{children}</code>
                            : <code className="bg-t-07 rounded px-1 py-0.5 text-[11px] font-mono text-t-60">{children}</code>;
                        },
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-2 border-t-20 pl-3 text-t-45 italic mb-2">{children}</blockquote>
                        ),
                        a: ({ children, href }) => (
                          <a href={href} className="text-blue-400/80 underline hover:text-blue-400" target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{children}</a>
                        ),
                        strong: ({ children }) => <strong className="font-semibold text-t-85">{children}</strong>,
                        em: ({ children }) => <em className="text-t-60 italic">{children}</em>,
                      }}
                    >
                      {description}
                    </ReactMarkdown>
              ) : (
                <span className="text-t-15">Нет описания. Нажмите чтобы добавить...</span>
              )}
            </div>
          ) : (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => { saveDescription(); if (description.trim()) setDescPreview(true); }}
              rows={6}
              placeholder={"Описание... (Markdown)\n\n- [ ] подзадача 1\n- [x] выполнено\n\n**жирный**, *курсив*, # заголовок"}
              className="w-full bg-t-03 border border-t-06 hover:border-t-08 focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/15 rounded-lg px-3 py-2.5 text-[13px] text-t-75 placeholder-t-15 outline-none resize-none transition-all duration-200 font-mono"
            />
          )}
        </div>

        {/* Column + Priority row */}
        <div className="flex gap-4">
          {/* Column */}
          <div className="flex-1">
            <label className="text-[11px] font-medium text-t-35 uppercase tracking-wider block mb-2">
              Колонка
            </label>
            <select
              value={columnId}
              onChange={(e) => handleColumnChange(e.target.value)}
              className="w-full bg-t-04 border border-t-06 hover:border-t-10 focus:border-accent-blue/50 outline-none rounded-lg px-3 py-2 text-[13px] text-t-75 transition-all duration-200"
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
            <label className="text-[11px] font-medium text-t-35 uppercase tracking-wider block mb-2">
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
                      : 'border-t-06 opacity-30 hover:opacity-60 hover:border-t-10'
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

        {/* Attachments — always visible if present, compact */}
        {task.attachments && task.attachments.length > 0 && (
          <div>
            <label className="text-[11px] font-medium text-t-35 uppercase tracking-wider block mb-1.5">
              Вложения ({task.attachments.length})
            </label>
            <div className="flex flex-wrap gap-1">
              {task.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-1.5 px-2 py-1 bg-t-03 border border-t-06 rounded-md group hover:border-t-12 transition-all text-[11px] text-t-60 cursor-pointer"
                  onClick={() => window.electronAPI?.openFile(att.filepath)}
                  title={att.filename}
                >
                  {isImage(att.filename) ? <Image size={10} className="text-t-30 flex-shrink-0" /> : <Paperclip size={10} className="text-t-30 flex-shrink-0" />}
                  <span className="truncate max-w-[140px]">{att.filename}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteAttachment(att.id); }}
                    className="opacity-0 group-hover:opacity-100 text-t-25 hover:text-red-400/70 transition-all flex-shrink-0"
                  >
                    <X size={9} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collapsible "More" section */}
        <button
          onClick={() => setShowMore((v) => !v)}
          className="flex items-center gap-1.5 text-[11px] text-t-30 hover:text-t-50 transition-colors self-start"
        >
          {showMore ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {showMore ? 'Свернуть' : 'Ещё...'}
          {(dueDate || taskTags.length > 0 || reminderAt || recurrenceRule) && !showMore && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent-blue/50" />
          )}
        </button>

        {showMore && (
          <div className="flex flex-col gap-4 pl-1 border-l-2 border-t-06 ml-1">
            {/* Due date */}
            <div>
              <label className="text-[11px] font-medium text-t-35 uppercase tracking-wider block mb-2">
                Дедлайн
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                  className="bg-t-04 border border-t-06 hover:border-t-10 focus:border-accent-blue/50 outline-none rounded-lg px-3 py-2 text-[13px] text-t-75 transition-all duration-200"
                />
                {dueDate && (
                  <button
                    onClick={() => handleDueDateChange('')}
                    className="text-t-25 hover:text-t-50 transition-colors text-[11px]"
                  >
                    Очистить
                  </button>
                )}
              </div>
            </div>

            {/* Completed at (read-only) */}
            {task.completed_at && (
              <div>
                <label className="text-[11px] font-medium text-t-35 uppercase tracking-wider block mb-2">
                  Дата выполнения
                </label>
                <span className="text-[13px] text-emerald-400/80 flex items-center gap-1.5">
                  <CheckCircle2 size={12} />
                  {new Date(task.completed_at).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}

            {/* Tags */}
            <div>
              <label className="text-[11px] font-medium text-t-35 uppercase tracking-wider block mb-2">
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

            {/* Reminder */}
            <div>
              <div className="text-[11px] font-medium text-t-35 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Bell size={10} />
                Напоминание
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={reminderAt}
                  onChange={(e) => handleReminderChange(e.target.value)}
                  className="bg-t-04 border border-t-06 hover:border-t-10 focus:border-accent-blue/50 outline-none rounded-lg px-3 py-2 text-[13px] text-t-75 transition-all duration-200"
                />
                {reminderAt && (
                  <button
                    onClick={() => handleReminderChange('')}
                    className="text-t-25 hover:text-t-50 transition-colors"
                    title="Убрать напоминание"
                  >
                    <BellOff size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Recurrence */}
            <div>
              <div className="text-[11px] font-medium text-t-35 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Timer size={10} />
                Повторение
              </div>
              <div className="flex flex-col gap-2">
                <select
                  value={recurrenceRule}
                  onChange={(e) => handleRecurrenceChange(e.target.value, recurrenceNext)}
                  className="bg-t-04 border border-t-06 hover:border-t-10 focus:border-accent-blue/50 outline-none rounded-lg px-3 py-2 text-[13px] text-t-75 transition-all duration-200"
                >
                  <option value="">Не повторять</option>
                  <option value="daily">Каждый день</option>
                  <option value="weekdays">По будням (Пн–Пт)</option>
                  <option value="weekly">Каждую неделю</option>
                  <option value="monthly">Каждый месяц</option>
                  <option value="custom:2:day">Каждые 2 дня</option>
                  <option value="custom:2:week">Каждые 2 недели</option>
                  <option value="custom:3:month">Каждые 3 месяца</option>
                </select>
                {recurrenceRule && (
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-t-40 flex-shrink-0">Следующее:</label>
                    <input
                      type="date"
                      value={recurrenceNext}
                      onChange={(e) => handleRecurrenceChange(recurrenceRule, e.target.value)}
                      className="flex-1 bg-t-04 border border-t-06 hover:border-t-10 focus:border-accent-blue/50 outline-none rounded-lg px-3 py-2 text-[13px] text-t-75 transition-all duration-200"
                    />
                  </div>
                )}
                {task.recurrence_rule && (
                  <p className="text-[10px] text-t-25 italic">
                    Новая задача создаётся автоматически когда наступает дата.
                  </p>
                )}
              </div>
            </div>

            {/* Related tasks */}
            <RelatedTasks taskId={task.id} />
          </div>
        )}

        {/* Task Updates */}
        <UpdatesSection taskId={task.id} />

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-t-25 pt-2 border-t border-t-04">
          <span className="flex items-center gap-1.5 bg-t-03 px-2 py-1 rounded-md">
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
          {task.time_spent != null && task.time_spent > 0 && (() => {
            const secs = task.time_spent;
            const h = Math.floor(secs / 3600);
            const m = Math.floor((secs % 3600) / 60);
            const timeStr = h > 0 ? `${h}ч ${m}м` : `${m}м`;
            return (
              <span className="flex items-center gap-1.5 bg-blue-500/[0.08] text-blue-400/60 px-2 py-1 rounded-md">
                <Timer size={11} />
                {timeStr} в фокусе
              </span>
            );
          })()}
        </div>

        {/* Footer — compact icon buttons */}
        <div className="flex justify-between items-center pt-1">
          <div className="flex gap-1">
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 size={12} />}
              onClick={handleDelete}
              onBlur={() => setConfirmDelete(false)}
              title={confirmDelete ? 'Точно удалить?' : 'Удалить'}
            >
              {confirmDelete ? 'Точно?' : undefined}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={savedTemplate ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
              onClick={handleSaveAsTemplate}
              title="Сохранить как шаблон"
            />
            <Button
              variant="ghost"
              size="sm"
              icon={<Timer size={12} />}
              onClick={() => window.electronAPI?.ipcSend('focus:openTask', task!.id)}
              title="Открыть в Focus Mode"
            />
            <Button
              variant="ghost"
              size="sm"
              icon={isConfidential ? <Lock size={12} className="text-amber-400" /> : <Unlock size={12} />}
              onClick={handleConfidentialToggle}
              title={isConfidential ? 'Конфиденциально' : 'Пометить как конфиденциальное'}
            />
            <Button
              variant="ghost"
              size="sm"
              icon={<Archive size={12} />}
              onClick={handleArchive}
              onBlur={() => setConfirmArchive(false)}
              title={confirmArchive ? 'Архивировать?' : 'Архивировать задачу'}
            >
              {confirmArchive ? 'Точно?' : undefined}
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>
    </Modal>
  );
}
