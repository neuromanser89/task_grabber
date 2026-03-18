import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Plus, Search, Trash2, Edit3, Check, X, ArrowRightCircle } from 'lucide-react';
import { useNoteStore } from '../../stores/noteStore';
import { useTaskStore } from '../../stores/taskStore';
import { useColumnStore } from '../../stores/columnStore';
import type { Note } from '@shared/types';

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins}м назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}ч назад`;
  return `${Math.floor(hrs / 24)}д назад`;
}

interface NoteCardProps {
  note: Note;
  onConvertToTask: (note: Note) => void;
}

function NoteCard({ note, onConvertToTask }: NoteCardProps) {
  const { updateNote, deleteNote } = useNoteStore();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(note.content);
  const [titleValue, setTitleValue] = useState(note.title ?? '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const startEdit = () => {
    setValue(note.content);
    setTitleValue(note.title ?? '');
    setEditing(true);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(value.length, value.length);
    }, 50);
  };

  const save = async () => {
    const trimmed = value.trim();
    const titleTrimmed = titleValue.trim() || null;
    if (trimmed && (trimmed !== note.content || titleTrimmed !== note.title)) {
      await updateNote(note.id, trimmed, titleTrimmed);
    }
    setEditing(false);
  };

  const cancel = () => {
    setValue(note.content);
    setTitleValue(note.title ?? '');
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') cancel();
    if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); save(); }
  };

  return (
    <div className="group glass-card rounded-xl p-4 flex flex-col gap-3 transition-all duration-200 hover:border-t-12 hover:shadow-lg">
      {editing ? (
        <div className="flex flex-col gap-2 flex-1">
          <input
            type="text"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            placeholder="Тема (опционально)"
            className="w-full bg-transparent text-[13px] font-semibold text-t-85 outline-none border-b border-t-06 pb-1.5 mb-1 placeholder-t-20"
          />
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={6}
            className="w-full bg-transparent text-[13px] text-t-85 outline-none resize-none leading-relaxed flex-1"
            placeholder="Текст заметки (markdown)..."
          />
          <div className="flex gap-1.5 justify-end pt-1 border-t border-t-06">
            <button
              onClick={save}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] text-green-400/80 hover:text-green-400 hover:bg-green-400/10 transition-colors"
            >
              <Check size={11} />
              Сохранить
            </button>
            <button
              onClick={cancel}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] text-t-30 hover:text-t-60 hover:bg-t-05 transition-colors"
            >
              <X size={11} />
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 min-h-[60px] overflow-hidden">
            {note.title && (
              <p className="text-[13px] font-semibold text-t-85 mb-2 leading-snug">{note.title}</p>
            )}
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="text-[13px] text-t-75 leading-relaxed mb-2 last:mb-0">{children}</p>,
                h1: ({ children }) => <h1 className="text-[14px] font-bold text-t-85 mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-[13px] font-bold text-t-80 mb-1.5">{children}</h2>,
                h3: ({ children }) => <h3 className="text-[12px] font-semibold text-t-75 mb-1">{children}</h3>,
                ul: ({ children }) => <ul className="mb-2 space-y-0.5 pl-4 list-disc">{children}</ul>,
                ol: ({ children }) => <ol className="mb-2 space-y-0.5 list-decimal pl-4">{children}</ol>,
                li: ({ children }) => <li className="text-[12px] text-t-70">{children}</li>,
                code: ({ children, className }) => {
                  const isBlock = className?.includes('language-');
                  return isBlock
                    ? <code className="block bg-t-05 rounded px-2 py-1.5 text-[11px] font-mono text-t-55 mb-2 overflow-x-auto">{children}</code>
                    : <code className="bg-t-07 rounded px-1 py-0.5 text-[11px] font-mono text-t-55">{children}</code>;
                },
                strong: ({ children }) => <strong className="font-semibold text-t-85">{children}</strong>,
                em: ({ children }) => <em className="text-t-60 italic">{children}</em>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-t-20 pl-3 text-t-45 italic mb-2">{children}</blockquote>
                ),
              }}
            >
              {note.content}
            </ReactMarkdown>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-t-04">
            <span className="text-[10px] text-t-20">{relativeTime(note.created_at)}</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onConvertToTask(note)}
                className="p-1.5 rounded-md text-t-25 hover:text-accent-blue hover:bg-accent-blue/10 transition-colors"
                title="Конвертировать в задачу"
              >
                <ArrowRightCircle size={13} />
              </button>
              <button
                onClick={startEdit}
                className="p-1.5 rounded-md text-t-25 hover:text-t-60 hover:bg-t-05 transition-colors"
                title="Редактировать"
              >
                <Edit3 size={13} />
              </button>
              <button
                onClick={() => deleteNote(note.id)}
                className="p-1.5 rounded-md text-t-25 hover:text-red-400/80 hover:bg-red-400/10 transition-colors"
                title="Удалить"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CreateNoteCard({ onCreated }: { onCreated: () => void }) {
  const { createNote } = useNoteStore();
  const [value, setValue] = useState('');
  const [titleValue, setTitleValue] = useState('');
  const [active, setActive] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activate = () => {
    setActive(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const save = async () => {
    const trimmed = value.trim();
    if (trimmed) {
      await createNote(trimmed, titleValue.trim() || null);
      setValue('');
      setTitleValue('');
      onCreated();
    }
    setActive(false);
  };

  const cancel = () => {
    setValue('');
    setTitleValue('');
    setActive(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') cancel();
    if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); save(); }
  };

  if (!active) {
    return (
      <button
        onClick={activate}
        className="glass-card rounded-xl p-4 flex items-center gap-2 text-[13px] text-t-25 hover:text-t-50 hover:border-t-12 transition-all duration-200 border-2 border-dashed border-t-08 min-h-[100px]"
      >
        <Plus size={16} className="flex-shrink-0" />
        Новая заметка
      </button>
    );
  }

  return (
    <div className="glass-card rounded-xl p-4 flex flex-col gap-3 border-accent-blue/30">
      <input
        type="text"
        value={titleValue}
        onChange={(e) => setTitleValue(e.target.value)}
        placeholder="Тема (опционально)"
        className="w-full bg-transparent text-[13px] font-semibold text-t-85 outline-none border-b border-t-06 pb-1.5 placeholder-t-20"
      />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={5}
        className="w-full bg-transparent text-[13px] text-t-85 outline-none resize-none leading-relaxed"
        placeholder="Текст заметки (поддерживается markdown)&#10;Ctrl+Enter — сохранить"
      />
      <div className="flex gap-1.5 justify-end pt-1 border-t border-t-06">
        <button
          onClick={save}
          className="flex items-center gap-1 px-3 py-1 rounded-md text-[11px] bg-accent-blue/80 hover:bg-accent-blue text-white transition-colors"
        >
          <Check size={11} />
          Сохранить
        </button>
        <button
          onClick={cancel}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] text-t-30 hover:text-t-60 hover:bg-t-05 transition-colors"
        >
          <X size={11} />
          Отмена
        </button>
      </div>
    </div>
  );
}

export default function NotesCanvasView() {
  const { notes } = useNoteStore();
  const { tasks, createTask } = useTaskStore();
  const { columns } = useColumnStore();
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');

  const filtered = search.trim()
    ? notes.filter((n) => n.content.toLowerCase().includes(search.toLowerCase()))
    : notes;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleConvertToTask = async (note: Note) => {
    const defaultCol = columns.find((c) => c.is_default) ?? columns[0];
    if (!defaultCol) return;

    const firstLine = note.content.split('\n')[0].replace(/^#+\s*/, '').trim().slice(0, 120);
    const title = firstLine || 'Заметка';
    const colTasks = tasks.filter((t) => t.column_id === defaultCol.id);
    const sortOrder = colTasks.length > 0 ? Math.max(...colTasks.map((t) => t.sort_order)) + 1 : 0;

    try {
      await createTask({
        title,
        description: note.content.trim() || null,
        column_id: defaultCol.id,
        sort_order: sortOrder,
        priority: 0,
        color: null,
        source_type: 'manual',
        source_info: null,
        due_date: null,
        archived_at: null,
        reminder_at: null,
      });
      showToast(`Задача создана: ${title}`);
    } catch {
      showToast('Ошибка при создании задачи');
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const el = document.getElementById('notes-search');
        el?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-t-04 flex-shrink-0">
        <h2 className="text-[14px] font-semibold text-t-70 flex-shrink-0">Заметки</h2>
        <span className="text-[11px] text-t-20 flex-shrink-0">
          {notes.length} {notes.length === 1 ? 'заметка' : notes.length < 5 ? 'заметки' : 'заметок'}
        </span>
        <div className="flex-1" />
        <div className="relative flex-shrink-0 w-56">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-t-25 pointer-events-none" />
          <input
            id="notes-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по заметкам..."
            className="w-full bg-t-04 border border-t-06 hover:border-t-10 focus:border-accent-blue/40 rounded-lg pl-7 pr-3 py-1.5 text-[12px] text-t-75 outline-none placeholder:text-t-20 transition-all duration-150"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-t-20 hover:text-t-50 transition-colors"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 && !search ? (
          <div className="flex flex-col items-center justify-center h-full text-t-20">
            <p className="text-[14px] mb-1">Заметок пока нет</p>
            <p className="text-[12px]">Создайте первую заметку или используйте Ctrl+Shift+N</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-t-20">
            <p className="text-[13px]">Ничего не найдено по запросу «{search}»</p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '16px',
              alignItems: 'start',
            }}
          >
            <CreateNoteCard onCreated={() => {}} />
            {filtered.map((note) => (
              <NoteCard key={note.id} note={note} onConvertToTask={handleConvertToTask} />
            ))}
          </div>
        )}

        {/* Empty grid but with create card */}
        {filtered.length === 0 && search && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '16px',
              alignItems: 'start',
            }}
          >
            <CreateNoteCard onCreated={() => {}} />
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-t-90 text-[12px] text-[#0F0F0F] rounded-lg shadow-xl pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  );
}
