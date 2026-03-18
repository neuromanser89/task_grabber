import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search, FileText, StickyNote, Hash, ArrowRight,
  Folder, Mail, Hand, LayoutDashboard,
} from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import { useColumnStore } from '../../stores/columnStore';
import { useNoteStore } from '../../stores/noteStore';
import { useBoardStore } from '../../stores/boardStore';
import type { TaskWithAttachments } from '@shared/types';
import { PRIORITY_LABELS } from '@shared/constants';

const PRIORITY_TEXT_COLORS: Record<number, string> = {
  1: 'text-blue-400',
  2: 'text-amber-400',
  3: 'text-red-400',
};

type ResultType =
  | { kind: 'task'; task: TaskWithAttachments; columnName: string; boardName: string }
  | { kind: 'note'; id: string; content: string; preview: string }
  | { kind: 'board'; id: string; name: string; color: string; taskCount: number };

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  manual: <Hand size={10} />,
  text: <FileText size={10} />,
  file: <Folder size={10} />,
  email: <Mail size={10} />,
};

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-accent-blue/25 text-accent-blue rounded-sm px-0.5 not-italic">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function scoreText(text: string, q: string): number {
  const t = text.toLowerCase();
  const lq = q.toLowerCase();
  if (t === lq) return 100;
  if (t.startsWith(lq)) return 80;
  if (t.includes(lq)) return 60;
  // fuzzy
  let ti = 0, qi = 0;
  while (ti < t.length && qi < lq.length) {
    if (t[ti] === lq[qi]) qi++;
    ti++;
  }
  return qi === lq.length ? 20 : 0;
}

export default function GlobalSearch({ isOpen, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [filter, setFilter] = useState<'all' | 'tasks' | 'notes' | 'boards'>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { tasks } = useTaskStore();
  const { columns } = useColumnStore();
  const { notes } = useNoteStore();
  const { boards } = useBoardStore();

  const colMap = useMemo(() => Object.fromEntries(columns.map((c) => [c.id, c])), [columns]);
  const boardMap = useMemo(() => Object.fromEntries(boards.map((b) => [b.id, b])), [boards]);

  const results = useMemo<ResultType[]>(() => {
    const q = query.trim();

    const taskResults: (ResultType & { score: number })[] = (filter === 'all' || filter === 'tasks')
      ? tasks
          .filter((t) => !t.archived_at)
          .map((task) => {
            const titleScore = scoreText(task.title, q || ' ');
            const descScore = q ? scoreText(task.description ?? '', q) : 0;
            const tagScore = q ? task.tags.reduce((max, tag) => Math.max(max, scoreText(tag.name, q)), 0) : 0;
            const score = Math.max(titleScore, descScore, tagScore);
            const col = colMap[task.column_id];
            const board = col?.board_id ? boardMap[col.board_id] : null;
            return {
              kind: 'task' as const,
              task,
              columnName: col?.name ?? '',
              boardName: board?.name ?? '',
              score: q ? score : 50,
            };
          })
          .filter((r) => !q || r.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 20)
      : [];

    const noteResults: (ResultType & { score: number })[] = (filter === 'all' || filter === 'notes')
      ? notes
          .map((note) => {
            const score = q ? scoreText(note.content, q) : 50;
            const preview = note.content.slice(0, 120).replace(/\n/g, ' ');
            return {
              kind: 'note' as const,
              id: note.id,
              content: note.content,
              preview,
              score: q ? score : 40,
            };
          })
          .filter((r) => !q || r.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
      : [];

    const boardResults: (ResultType & { score: number })[] = (filter === 'all' || filter === 'boards')
      ? boards
          .map((board) => {
            const score = q ? scoreText(board.name, q) : 30;
            const taskCount = tasks.filter((t) => {
              const col = colMap[t.column_id];
              return col?.board_id === board.id && !t.archived_at;
            }).length;
            return {
              kind: 'board' as const,
              id: board.id,
              name: board.name,
              color: board.color,
              taskCount,
              score: q ? score : 30,
            };
          })
          .filter((r) => !q || r.score > 0)
          .sort((a, b) => b.score - a.score)
      : [];

    if (filter !== 'all') {
      if (filter === 'tasks') return taskResults;
      if (filter === 'notes') return noteResults;
      if (filter === 'boards') return boardResults;
    }

    // Merge and sort by score
    return [...taskResults, ...noteResults, ...boardResults]
      .sort((a, b) => (b as { score: number }).score - (a as { score: number }).score)
      .slice(0, 25);
  }, [query, filter, tasks, notes, boards, colMap, boardMap]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIdx(0);
      setFilter('all');
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  useEffect(() => { setSelectedIdx(0); }, [query, filter]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${selectedIdx}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  const runResult = useCallback((result: ResultType) => {
    if (result.kind === 'task') {
      window.dispatchEvent(new CustomEvent('board:openTask', { detail: result.task.id }));
    } else if (result.kind === 'note') {
      window.dispatchEvent(new CustomEvent('sidebar:openNote', { detail: result.id }));
    } else if (result.kind === 'board') {
      window.dispatchEvent(new CustomEvent('board:switchBoard', { detail: result.id }));
    }
    onClose();
  }, [onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[selectedIdx];
      if (r) runResult(r);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const order = ['all', 'tasks', 'notes', 'boards'] as const;
      const idx = order.indexOf(filter);
      setFilter(order[(idx + 1) % order.length]);
    }
  }, [results, selectedIdx, runResult, onClose, filter]);

  if (!isOpen) return null;

  const q = query.trim();

  function renderResult(result: ResultType, idx: number) {
    const isSelected = idx === selectedIdx;
    const base = `flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-100 ${
      isSelected
        ? 'bg-accent-blue/[0.10] border border-accent-blue/20'
        : 'hover:bg-t-04 border border-transparent'
    }`;

    if (result.kind === 'task') {
      const prio = result.task.priority ?? 0;
      const col = colMap[result.task.column_id];
      return (
        <div key={result.task.id} data-idx={idx} className={base} onMouseDown={() => runResult(result)}>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-t-10 text-t-70' : 'bg-t-04 text-t-35'}`}>
            <FileText size={13} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] text-t-85 truncate font-medium">
              {highlight(result.task.title, q)}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {result.boardName && (
                <span className="text-[10px] text-t-30 flex items-center gap-0.5">
                  <LayoutDashboard size={9} />
                  {result.boardName}
                </span>
              )}
              {col && (
                <span className="text-[10px] text-t-35 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col.color }} />
                  {result.columnName}
                </span>
              )}
              {prio > 0 && (
                <span className={`text-[10px] font-medium ${PRIORITY_TEXT_COLORS[prio] ?? 'text-t-40'}`}>
                  {PRIORITY_LABELS[prio]}
                </span>
              )}
              {result.task.tags.length > 0 && (
                <span className="text-[10px] text-t-30 flex items-center gap-0.5">
                  <Hash size={9} />
                  {result.task.tags.map((t) => t.name).join(', ')}
                </span>
              )}
              <span className="text-[10px] text-t-20 flex items-center gap-0.5 ml-auto">
                {SOURCE_ICONS[result.task.source_type ?? 'manual']}
              </span>
            </div>
          </div>
          <ArrowRight size={11} className={`flex-shrink-0 ${isSelected ? 'text-accent-blue/50' : 'text-t-15'}`} />
        </div>
      );
    }

    if (result.kind === 'note') {
      return (
        <div key={result.id} data-idx={idx} className={base} onMouseDown={() => runResult(result)}>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-accent-green/25 text-accent-green' : 'bg-t-04 text-t-30'}`}>
            <StickyNote size={13} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] text-t-70 truncate">
              {highlight(result.preview, q)}
            </div>
            <span className="text-[10px] text-t-25">заметка</span>
          </div>
        </div>
      );
    }

    if (result.kind === 'board') {
      return (
        <div key={result.id} data-idx={idx} className={base} onMouseDown={() => runResult(result)}>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-t-10' : 'bg-t-04'}`}>
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: result.color }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] text-t-80 truncate font-medium">
              {highlight(result.name, q)}
            </div>
            <span className="text-[10px] text-t-25">{result.taskCount} задач · доска</span>
          </div>
          <LayoutDashboard size={11} className={`flex-shrink-0 ${isSelected ? 'text-accent-blue/50' : 'text-t-15'}`} />
        </div>
      );
    }

    return null;
  }

  const filterLabels: { key: typeof filter; label: string }[] = [
    { key: 'all', label: 'Всё' },
    { key: 'tasks', label: 'Задачи' },
    { key: 'notes', label: 'Заметки' },
    { key: 'boards', label: 'Доски' },
  ];

  return (
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center pt-[8vh] bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute top-[4vh] left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent-blue/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-[640px] mx-4 glass-heavy rounded-2xl border border-t-08 shadow-2xl overflow-hidden animate-fade-in-scale">
        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-accent-blue/25 to-transparent rounded-full" />

        {/* Search row */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-t-06">
          <Search size={16} className="text-t-40 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Поиск по задачам, заметкам, доскам..."
            className="flex-1 bg-transparent text-[14px] text-t-90 placeholder:text-t-25 outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden sm:flex items-center h-5 px-1.5 rounded bg-t-06 border border-t-08 text-[10px] text-t-30 font-mono">Esc</kbd>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 px-3 pt-2 pb-1 border-b border-t-04">
          {filterLabels.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-2.5 py-0.5 rounded-md text-[11px] transition-colors ${
                filter === key
                  ? 'bg-accent-blue/15 text-accent-blue font-medium'
                  : 'text-t-35 hover:text-t-60 hover:bg-t-04'
              }`}
            >
              {label}
            </button>
          ))}
          <span className="ml-auto text-[10px] text-t-20">{results.length} результатов</span>
        </div>

        {/* Results list */}
        <div ref={listRef} className="max-h-[380px] overflow-y-auto p-2 space-y-0.5 scrollbar-thin">
          {results.length === 0 ? (
            <div className="py-10 text-center text-sm text-t-30">
              {q ? 'Ничего не найдено' : 'Начните вводить для поиска...'}
            </div>
          ) : (
            results.map((r, idx) => renderResult(r, idx))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-t-04 text-[10px] text-t-20">
          <span><kbd className="font-mono">↑↓</kbd> навигация</span>
          <span><kbd className="font-mono">Enter</kbd> открыть</span>
          <span><kbd className="font-mono">Tab</kbd> фильтр</span>
          <span className="ml-auto"><kbd className="font-mono">Ctrl+Space</kbd> поиск</span>
        </div>
      </div>
    </div>
  );
}
