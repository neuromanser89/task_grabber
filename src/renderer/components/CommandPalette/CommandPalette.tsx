import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, Plus, Settings, FileText, Hash, ArrowRight } from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import { useColumnStore } from '../../stores/columnStore';
import type { TaskWithAttachments } from '@shared/types';

type CommandAction =
  | { type: 'task'; task: TaskWithAttachments }
  | { type: 'command'; id: string; label: string; icon: React.ReactNode; action: () => void }
  | { type: 'move'; task: TaskWithAttachments; columnId: string; columnName: string };

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNewTask: () => void;
  onSettings: () => void;
}

function scoreMatch(text: string, query: string): number {
  if (!query) return 1;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  // fuzzy: all chars of query appear in order
  let ti = 0;
  let qi = 0;
  while (ti < t.length && qi < q.length) {
    if (t[ti] === q[qi]) qi++;
    ti++;
  }
  return qi === q.length ? 30 : 0;
}

const PRIORITY_LABELS = ['', 'Low', 'Medium', 'High'];
const PRIORITY_COLORS = ['', 'text-blue-400', 'text-amber-400', 'text-red-400'];
const SOURCE_ICONS: Record<string, React.ReactNode> = {
  manual: <FileText size={11} />,
  text: <FileText size={11} />,
  file: <FileText size={11} />,
  email: <FileText size={11} />,
};

export default function CommandPalette({ isOpen, onClose, onNewTask, onSettings }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { tasks } = useTaskStore();
  const { columns } = useColumnStore();

  // Static commands
  const staticCommands = useMemo<CommandAction[]>(() => [
    {
      type: 'command',
      id: 'new-task',
      label: 'Создать задачу',
      icon: <Plus size={14} />,
      action: () => { onClose(); onNewTask(); },
    },
    {
      type: 'command',
      id: 'settings',
      label: 'Настройки',
      icon: <Settings size={14} />,
      action: () => { onClose(); onSettings(); },
    },
  ], [onClose, onNewTask, onSettings]);

  const items = useMemo<CommandAction[]>(() => {
    const q = query.trim().toLowerCase();

    // Detect "move" prefix: "> " or ">"
    const isMoveMode = q.startsWith('>');
    if (isMoveMode) {
      // ">" — show move commands for tasks
      const moveQuery = q.slice(1).trim();
      // Show all tasks filterable by move query
      const results: CommandAction[] = [];
      for (const task of tasks.filter((t) => !t.archived_at)) {
        for (const targetCol of columns) {
          if (targetCol.id === task.column_id) continue;
          const combined = `${task.title} → ${targetCol.name}`;
          const score = moveQuery ? scoreMatch(combined, moveQuery) : 50;
          if (score > 0) {
            results.push({ type: 'move', task, columnId: targetCol.id, columnName: targetCol.name });
          }
        }
      }
      return results.slice(0, 12);
    }

    if (!q) {
      // Show commands first, then recent tasks
      const recentTasks: CommandAction[] = tasks
        .filter((t) => !t.archived_at)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 6)
        .map((task) => ({ type: 'task', task }));
      return [...staticCommands, ...recentTasks];
    }

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

    const cmdResults: (CommandAction & { score: number })[] = staticCommands
      .filter((c) => c.type === 'command')
      .map((c) => {
        if (c.type !== 'command') return null;
        const score = scoreMatch(c.label, q);
        return score > 0 ? { ...c, score } : null;
      })
      .filter(Boolean) as (CommandAction & { score: number })[];

    const combined = [...cmdResults, ...taskResults].sort((a, b) => b.score - a.score);
    return combined.slice(0, 10);
  }, [query, tasks, columns, staticCommands]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected into view
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

  function renderItem(item: CommandAction, idx: number) {
    const isSelected = idx === selectedIndex;
    const base = `flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-100 ${
      isSelected ? 'bg-accent-blue/20 border border-accent-blue/30' : 'hover:bg-white/[0.04] border border-transparent'
    }`;

    if (item.type === 'command') {
      return (
        <div key={item.id} data-idx={idx} className={base} onMouseDown={() => runItem(item)}>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-accent-blue/30 text-accent-blue' : 'bg-white/[0.06] text-white/50'}`}>
            {item.icon}
          </div>
          <span className="text-sm text-white/85">{item.label}</span>
          <span className="ml-auto text-[10px] text-white/25 font-mono">команда</span>
        </div>
      );
    }

    if (item.type === 'task') {
      const col = colMap[item.task.column_id];
      const prio = item.task.priority ?? 0;
      return (
        <div key={item.task.id} data-idx={idx} className={base} onMouseDown={() => runItem(item)}>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-white/10 text-white/60' : 'bg-white/[0.04] text-white/30'}`}>
            <FileText size={12} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-white/85 truncate">{item.task.title}</div>
            <div className="flex items-center gap-2 mt-0.5">
              {col && (
                <span className="text-[10px] text-white/35 flex items-center gap-1">
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
                <span className="text-[10px] text-white/30 flex items-center gap-0.5">
                  <Hash size={9} />
                  {item.task.tags.map((t) => t.name).join(', ')}
                </span>
              )}
            </div>
          </div>
          <ArrowRight size={12} className={`flex-shrink-0 ${isSelected ? 'text-accent-blue/60' : 'text-white/15'}`} />
        </div>
      );
    }

    if (item.type === 'move') {
      return (
        <div key={`${item.task.id}::${item.columnId}`} data-idx={idx} className={base} onMouseDown={() => runItem(item)}>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-accent-purple/30 text-accent-purple' : 'bg-white/[0.04] text-white/30'}`}>
            <ArrowRight size={12} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-white/85 truncate">{item.task.title}</div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] text-white/30">→</span>
              <span className="text-[10px] text-white/50 flex items-center gap-1">
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

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] bg-black/50 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-[560px] mx-4 glass-heavy rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06]">
          <Search size={16} className="text-white/40 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Поиск задач и команд... (> для перемещения)"
            className="flex-1 bg-transparent text-sm text-white/90 placeholder:text-white/30 outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden sm:flex items-center h-5 px-1.5 rounded bg-white/[0.06] border border-white/[0.08] text-[10px] text-white/30 font-mono">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto p-2 space-y-0.5 scrollbar-thin">
          {items.length === 0 ? (
            <div className="py-8 text-center text-sm text-white/30">Ничего не найдено</div>
          ) : (
            items.map((item, idx) => renderItem(item, idx))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-white/[0.04] text-[10px] text-white/20">
          <span className="flex items-center gap-1"><kbd className="font-mono">↑↓</kbd> навигация</span>
          <span className="flex items-center gap-1"><kbd className="font-mono">Enter</kbd> выбрать</span>
          <span className="flex items-center gap-1"><kbd className="font-mono">&gt;</kbd> перемещение задач</span>
          <span className="ml-auto flex items-center gap-1"><kbd className="font-mono">Esc</kbd> закрыть</span>
        </div>
      </div>
    </div>
  );
}
