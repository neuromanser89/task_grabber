import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search, Plus, Settings, FileText, Hash, ArrowRight, Bot,
  StickyNote, Download, Upload, Sun, Moon, Monitor, Archive,
  LayoutDashboard, Timer, ChevronRight,
} from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import { useColumnStore } from '../../stores/columnStore';
import { useNoteStore } from '../../stores/noteStore';
import type { TaskWithAttachments } from '@shared/types';

type CommandAction =
  | { type: 'task'; task: TaskWithAttachments }
  | { type: 'note'; id: string; snippet: string }
  | { type: 'command'; id: string; label: string; icon: React.ReactNode; hint?: string; action: () => void }
  | { type: 'move'; task: TaskWithAttachments; columnId: string; columnName: string };

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNewTask: () => void;
  onSettings: () => void;
  onAI?: () => void;
  onQuickNote?: () => void;
  onThemeCycle?: () => void;
  currentTheme?: 'dark' | 'light' | 'system';
}

function scoreMatch(text: string, query: string): number {
  if (!query) return 1;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  let ti = 0, qi = 0;
  while (ti < t.length && qi < q.length) {
    if (t[ti] === q[qi]) qi++;
    ti++;
  }
  return qi === q.length ? 30 : 0;
}

const PRIORITY_LABELS = ['', 'Low', 'Medium', 'High'];
const PRIORITY_COLORS = ['', 'text-blue-400', 'text-amber-400', 'text-red-400'];

const THEME_ICONS: Record<string, React.ReactNode> = {
  dark: <Moon size={14} />,
  light: <Sun size={14} />,
  system: <Monitor size={14} />,
};

function modeHint(query: string): string | null {
  const q = query.trim();
  if (q === '>') return 'Введите имя задачи для перемещения...';
  if (q.startsWith('> ') && q.length === 2) return 'Введите имя задачи для перемещения...';
  if (q === ':') return 'Введите текст для поиска по заметкам...';
  return null;
}

export default function CommandPalette({
  isOpen, onClose, onNewTask, onSettings, onAI, onQuickNote, onThemeCycle, currentTheme,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { tasks } = useTaskStore();
  const { columns } = useColumnStore();
  const { notes } = useNoteStore();

  // All available commands
  const allCommands = useMemo<CommandAction[]>(() => {
    const nextTheme = currentTheme === 'dark' ? 'light' : currentTheme === 'light' ? 'system' : 'dark';
    const themeLabel = `Тема: ${currentTheme === 'dark' ? 'Тёмная' : currentTheme === 'light' ? 'Светлая' : 'Системная'}`;
    return [
      {
        type: 'command', id: 'new-task', label: 'Создать задачу', hint: 'Ctrl+Shift+T',
        icon: <Plus size={14} />,
        action: () => { onClose(); onNewTask(); },
      },
      {
        type: 'command', id: 'quick-note', label: 'Быстрая заметка', hint: 'Ctrl+Shift+N',
        icon: <StickyNote size={14} />,
        action: () => { onClose(); onQuickNote?.(); },
      },
      ...(onAI ? [{
        type: 'command' as const, id: 'ai', label: 'AI Помощник',
        icon: <Bot size={14} />,
        action: () => { onClose(); onAI(); },
      }] : []),
      {
        type: 'command', id: 'settings', label: 'Настройки',
        icon: <Settings size={14} />,
        action: () => { onClose(); onSettings(); },
      },
      {
        type: 'command', id: 'theme', label: themeLabel, hint: `→ ${nextTheme === 'dark' ? 'Тёмная' : nextTheme === 'light' ? 'Светлая' : 'Системная'}`,
        icon: THEME_ICONS[currentTheme ?? 'dark'],
        action: () => { onClose(); onThemeCycle?.(); },
      },
      {
        type: 'command', id: 'export', label: 'Экспорт данных (JSON)',
        icon: <Download size={14} />,
        action: () => { onClose(); window.electronAPI?.exportData(); },
      },
      {
        type: 'command', id: 'import', label: 'Импорт данных (JSON)',
        icon: <Upload size={14} />,
        action: () => { onClose(); window.electronAPI?.importData(); },
      },
      {
        type: 'command', id: 'archive', label: 'Открыть архив',
        icon: <Archive size={14} />,
        action: () => { onClose(); window.dispatchEvent(new CustomEvent('sidebar:openArchive')); },
      },
      {
        type: 'command', id: 'widget', label: 'Виджет вкл/выкл',
        icon: <LayoutDashboard size={14} />,
        action: () => { onClose(); window.electronAPI?.ipcSend('widget:toggle'); },
      },
      {
        type: 'command', id: 'focus', label: 'Focus Mode',
        icon: <Timer size={14} />,
        action: () => { onClose(); window.electronAPI?.ipcSend('focus:openTask', ''); },
      },
    ] as CommandAction[];
  }, [onClose, onNewTask, onSettings, onAI, onQuickNote, onThemeCycle, currentTheme]);

  const items = useMemo<CommandAction[]>(() => {
    const raw = query.trim();
    const q = raw.toLowerCase();

    // `:` prefix — notes search
    if (raw.startsWith(':')) {
      const noteQuery = raw.slice(1).trim().toLowerCase();
      if (!noteQuery) return [];
      return notes
        .filter((n) => n.content.toLowerCase().includes(noteQuery))
        .slice(0, 8)
        .map((n) => ({
          type: 'note' as const,
          id: n.id,
          snippet: n.content.slice(0, 120),
        }));
    }

    // `>` prefix — task move mode
    if (raw.startsWith('>')) {
      const moveQuery = raw.slice(1).trim().toLowerCase();
      if (!moveQuery) return [];
      const results: CommandAction[] = [];
      for (const task of tasks.filter((t) => !t.archived_at)) {
        for (const targetCol of columns) {
          if (targetCol.id === task.column_id) continue;
          const combined = `${task.title} → ${targetCol.name}`;
          if (scoreMatch(combined, moveQuery) > 0) {
            results.push({ type: 'move', task, columnId: targetCol.id, columnName: targetCol.name });
          }
        }
      }
      return results.slice(0, 12);
    }

    // No query — show all commands + recent tasks
    if (!raw) {
      const recentTasks: CommandAction[] = tasks
        .filter((t) => !t.archived_at)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5)
        .map((task) => ({ type: 'task', task }));
      return [...allCommands, ...recentTasks];
    }

    // Regular search — tasks + commands
    const taskResults: (CommandAction & { score: number })[] = tasks
      .filter((t) => !t.archived_at)
      .map((task) => {
        const score = Math.max(
          scoreMatch(task.title, q),
          scoreMatch(task.description ?? '', q)
        );
        return { type: 'task' as const, task, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);

    const cmdResults: (CommandAction & { score: number })[] = allCommands
      .filter((c): c is CommandAction & { type: 'command'; label: string } => c.type === 'command')
      .map((c) => {
        const score = scoreMatch(c.label, q);
        return score > 0 ? { ...c, score } : null;
      })
      .filter(Boolean) as (CommandAction & { score: number })[];

    return [...cmdResults, ...taskResults]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [query, tasks, columns, notes, allCommands]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${selectedIndex}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const runItem = useCallback((item: CommandAction) => {
    if (item.type === 'command') {
      item.action();
    } else if (item.type === 'task') {
      window.dispatchEvent(new CustomEvent('board:openTask', { detail: item.task.id }));
      onClose();
    } else if (item.type === 'note') {
      window.dispatchEvent(new CustomEvent('sidebar:openNote', { detail: item.id }));
      onClose();
    } else if (item.type === 'move') {
      const colTasks = tasks.filter((t) => t.column_id === item.columnId);
      const maxOrder = colTasks.length > 0 ? Math.max(...colTasks.map((t) => t.sort_order)) + 1 : 0;
      useTaskStore.getState().moveTask(item.task.id, item.columnId, maxOrder);
      onClose();
    }
  }, [tasks, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[selectedIndex];
      if (item) runItem(item);
    }
  }, [items, selectedIndex, runItem, onClose]);

  if (!isOpen) return null;

  const colMap = Object.fromEntries(columns.map((c) => [c.id, c]));
  const hint = modeHint(query);
  const mode = query.trimStart().startsWith(':') ? 'notes' : query.trimStart().startsWith('>') ? 'move' : 'default';

  function renderItem(item: CommandAction, idx: number) {
    const isSelected = idx === selectedIndex;
    const base = `flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-100 ${
      isSelected ? 'bg-accent-blue/[0.12] border border-accent-blue/25 shadow-[0_0_12px_rgba(59,130,246,0.08)]' : 'hover:bg-t-04 border border-transparent'
    }`;

    if (item.type === 'command') {
      return (
        <div key={item.id} data-idx={idx} className={base} onMouseDown={() => runItem(item)}>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-accent-blue/30 text-accent-blue' : 'bg-t-06 text-t-50'}`}>
            {item.icon}
          </div>
          <span className="text-sm text-t-85 flex-1">{item.label}</span>
          {item.hint && <span className="text-[10px] text-t-25 font-mono flex-shrink-0">{item.hint}</span>}
          <ChevronRight size={11} className={`flex-shrink-0 ml-1 ${isSelected ? 'text-accent-blue/50' : 'text-t-10'}`} />
        </div>
      );
    }

    if (item.type === 'task') {
      const col = colMap[item.task.column_id];
      const prio = item.task.priority ?? 0;
      return (
        <div key={item.task.id} data-idx={idx} className={base} onMouseDown={() => runItem(item)}>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-t-10 text-t-60' : 'bg-t-04 text-t-30'}`}>
            <FileText size={12} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-t-85 truncate">{item.task.title}</div>
            <div className="flex items-center gap-2 mt-0.5">
              {col && (
                <span className="text-[10px] text-t-35 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col.color }} />
                  {col.name}
                </span>
              )}
              {prio > 0 && (
                <span className={`text-[10px] font-medium ${PRIORITY_COLORS[prio]}`}>
                  {PRIORITY_LABELS[prio]}
                </span>
              )}
              {item.task.tags.length > 0 && (
                <span className="text-[10px] text-t-30 flex items-center gap-0.5">
                  <Hash size={9} />
                  {item.task.tags.map((t) => t.name).join(', ')}
                </span>
              )}
            </div>
          </div>
          <ArrowRight size={12} className={`flex-shrink-0 ${isSelected ? 'text-accent-blue/60' : 'text-t-15'}`} />
        </div>
      );
    }

    if (item.type === 'note') {
      return (
        <div key={item.id} data-idx={idx} className={base} onMouseDown={() => runItem(item)}>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-accent-green/30 text-accent-green' : 'bg-t-04 text-t-30'}`}>
            <StickyNote size={12} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-t-75 truncate">{item.snippet}</div>
          </div>
          <span className="text-[10px] text-t-25 flex-shrink-0">заметка</span>
        </div>
      );
    }

    if (item.type === 'move') {
      return (
        <div key={`${item.task.id}::${item.columnId}`} data-idx={idx} className={base} onMouseDown={() => runItem(item)}>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-accent-purple/30 text-accent-purple' : 'bg-t-04 text-t-30'}`}>
            <ArrowRight size={12} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-t-85 truncate">{item.task.title}</div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] text-t-30">→</span>
              <span className="text-[10px] text-t-50 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colMap[item.columnId]?.color ?? '#888' }} />
                {item.columnName}
              </span>
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  const modeBadge = mode === 'move'
    ? <span className="px-1.5 py-0.5 rounded bg-accent-purple/20 text-accent-purple text-[10px] font-medium">Перемещение</span>
    : mode === 'notes'
    ? <span className="px-1.5 py-0.5 rounded bg-accent-green/20 text-accent-green text-[10px] font-medium">Заметки</span>
    : null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] bg-black/50 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Ambient glow */}
      <div className="absolute top-[8vh] left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-accent-blue/[0.04] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-[580px] mx-4 glass-heavy rounded-2xl border border-t-08 shadow-2xl overflow-hidden animate-fade-in-scale">
        {/* Top gradient line */}
        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-accent-blue/30 to-transparent rounded-full" />

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-t-06">
          <Search size={16} className="text-t-40 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Поиск задач и команд...  >перемещение  :заметки"
            className="flex-1 bg-transparent text-sm text-t-90 placeholder:text-t-25 outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {modeBadge}
          <kbd className="hidden sm:flex items-center h-5 px-1.5 rounded bg-t-06 border border-t-08 text-[10px] text-t-30 font-mono flex-shrink-0">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[380px] overflow-y-auto p-2 space-y-0.5 scrollbar-thin">
          {hint ? (
            <div className="py-6 text-center text-sm text-t-30">{hint}</div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-sm text-t-30">Ничего не найдено</div>
          ) : (
            items.map((item, idx) => renderItem(item, idx))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-t-04 text-[10px] text-t-20">
          <span><kbd className="font-mono">↑↓</kbd> навигация</span>
          <span><kbd className="font-mono">Enter</kbd> выбрать</span>
          <span><kbd className="font-mono">&gt;</kbd> переместить задачу</span>
          <span><kbd className="font-mono">:</kbd> поиск заметок</span>
          <span className="ml-auto"><kbd className="font-mono">Esc</kbd> закрыть</span>
        </div>
      </div>
    </div>
  );
}
