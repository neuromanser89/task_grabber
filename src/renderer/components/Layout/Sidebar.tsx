import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, Tag, RotateCcw, ChevronLeft, ChevronRight, ChevronDown, Hand, FileText, Folder, Mail, BarChart2, LayoutDashboard } from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import { useColumnStore } from '../../stores/columnStore';
import { useBoardStore } from '../../stores/boardStore';
import type { Tag as TagType } from '@shared/types';
import { PRIORITY_LABELS, PRIORITY_COLORS } from '@shared/constants';
import type { Priority, SourceType } from '@shared/types';
import StatsPanel from '../Stats/StatsPanel';

const SOURCES: { value: SourceType; label: string; icon: React.ReactNode }[] = [
  { value: 'manual', label: 'Вручную', icon: <Hand size={11} /> },
  { value: 'text', label: 'Текст', icon: <FileText size={11} /> },
  { value: 'file', label: 'Файл', icon: <Folder size={11} /> },
  { value: 'email', label: 'Письмо', icon: <Mail size={11} /> },
];

const PALETTE = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E', '#6B7280', '#78716C', '#FFFFFF',
];

function ColorPickerPopup({ x, y, currentColor, onPick, onClose }: {
  x: number; y: number; currentColor: string; onPick: (color: string) => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[9999] glass-heavy border border-t-10 rounded-lg shadow-2xl p-2"
      style={{ top: y, left: x }}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="grid grid-cols-5 gap-1.5">
        {PALETTE.map((c) => (
          <button
            key={c}
            onClick={() => { onPick(c); onClose(); }}
            className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-125 ${
              c === currentColor ? 'border-white scale-110' : 'border-transparent'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>,
    document.body
  );
}

const STORAGE_KEY = 'sidebar_collapsed_sections';

function loadCollapsed(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveCollapsed(state: Record<string, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function FilterSection({ id, label, icon, count, children }: {
  id: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(() => loadCollapsed()[id] ?? false);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      const all = loadCollapsed();
      all[id] = next;
      saveCollapsed(all);
      return next;
    });
  }, [id]);

  return (
    <div>
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 mb-1.5 w-full group/sec"
      >
        <ChevronDown
          size={10}
          className={`text-t-20 transition-transform duration-150 ${collapsed ? '-rotate-90' : ''}`}
        />
        {icon}
        <span className="text-[10px] font-medium text-t-30 uppercase tracking-wider">{label}</span>
        {count != null && count > 0 && (
          <span className="ml-auto text-[9px] text-accent-blue tabular-nums">{count}</span>
        )}
      </button>
      {!collapsed && children}
    </div>
  );
}

export interface SidebarHandle {
  focusSearch: () => void;
}

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

const Sidebar = forwardRef<SidebarHandle, Props>(function Sidebar({ collapsed, onToggle }, ref) {
  const {
    searchQuery, filterTags, filterPriority, filterSource, filterBoards,
    setSearch, toggleTagFilter, togglePriorityFilter, toggleSourceFilter, toggleBoardFilter, resetFilters,
    tasks, setColumnBoardMap,
  } = useTaskStore();

  const { columns } = useColumnStore();
  const { boards } = useBoardStore();

  const [activeTab, setActiveTab] = useState<'filters' | 'stats'>('filters');
  const [allTags, setAllTags] = useState<TagType[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Color picker state
  const [colorPicker, setColorPicker] = useState<{
    x: number; y: number; currentColor: string;
    type: 'tag' | 'board' | 'priority';
    id: string; // tag_id, board_id, or priority number as string
  } | null>(null);

  // Priority custom colors (stored in settings)
  const [priorityColors, setPriorityColors] = useState<Record<number, string>>({ ...PRIORITY_COLORS });
  useEffect(() => {
    window.electronAPI?.getSetting('custom_priority_colors').then((val) => {
      if (val) {
        try { setPriorityColors({ ...PRIORITY_COLORS, ...JSON.parse(val) }); } catch {}
      }
    });
  }, []);

  useImperativeHandle(ref, () => ({
    focusSearch: () => {
      searchInputRef.current?.focus();
    },
  }));

  const reloadTags = useCallback(() => {
    window.electronAPI?.getTags().then(setAllTags);
  }, []);

  useEffect(() => {
    reloadTags();
  }, [tasks, reloadTags]); // reload when tasks change (new tags might appear)

  useEffect(() => {
    window.addEventListener('tags-changed', reloadTags);
    return () => window.removeEventListener('tags-changed', reloadTags);
  }, [reloadTags]);

  // Keep columnBoardMap in sync
  useEffect(() => {
    const map: Record<string, string> = {};
    for (const col of columns) {
      if (col.board_id) map[col.id] = col.board_id;
    }
    setColumnBoardMap(map);
  }, [columns, setColumnBoardMap]);

  const hasFilters = !!(searchQuery || filterTags.length > 0 || filterPriority.length > 0 || filterSource.length > 0 || filterBoards.length > 0);

  // Count tasks per tag
  const tagCounts: Record<string, number> = {};
  for (const task of tasks) {
    for (const tag of task.tags) {
      tagCounts[tag.id] = (tagCounts[tag.id] ?? 0) + 1;
    }
  }

  const handleColorPick = async (color: string) => {
    if (!colorPicker) return;
    const { type, id } = colorPicker;
    if (type === 'tag') {
      await window.electronAPI?.updateTag(id, { color });
      setAllTags(prev => prev.map(t => t.id === id ? { ...t, color } : t));
      // Обновить теги на карточках задач
      useTaskStore.getState().fetchAll();
    } else if (type === 'board') {
      await window.electronAPI?.updateBoard(id, { color });
      useBoardStore.getState().fetchBoards();
    } else if (type === 'priority') {
      const p = Number(id);
      const next = { ...priorityColors, [p]: color };
      setPriorityColors(next);
      // Save only overrides
      const overrides: Record<number, string> = {};
      for (const k of [0, 1, 2, 3]) {
        if (next[k] !== PRIORITY_COLORS[k]) overrides[k] = next[k];
      }
      await window.electronAPI?.setSetting('custom_priority_colors', JSON.stringify(overrides));
    }
  };

  return (
    <aside
      className={`flex flex-col flex-shrink-0 h-full border-r transition-all duration-200 overflow-hidden glass ${
        collapsed ? 'w-10' : 'w-[200px]'
      }`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-2 py-2.5 border-b border-t-04">
        {!collapsed && (
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('filters')}
              className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                activeTab === 'filters'
                  ? 'bg-t-07 text-t-70'
                  : 'text-t-30 hover:text-t-55'
              }`}
            >
              Фильтры
              {hasFilters && <span className="ml-1 w-1.5 h-1.5 inline-block rounded-full bg-accent-blue align-middle" />}
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`text-[11px] px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                activeTab === 'stats'
                  ? 'bg-t-07 text-t-70'
                  : 'text-t-30 hover:text-t-55'
              }`}
              title="Статистика"
            >
              <BarChart2 size={10} />
            </button>
          </div>
        )}
        <button
          onClick={onToggle}
          className="w-6 h-6 flex items-center justify-center rounded-md text-t-30 hover:text-t-60 hover:bg-t-06 transition-all ml-auto"
          title={collapsed ? 'Развернуть панель' : 'Свернуть панель'}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {!collapsed && (
        <>
          {activeTab === 'filters' ? (
            <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-4">
              {/* Search */}
              <div>
                <div className="relative">
                  <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-t-25 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Поиск..."
                    className="w-full bg-t-04 border border-t-06 hover:border-t-10 focus:border-accent-blue/40 outline-none rounded-lg pl-7 pr-2.5 py-1.5 text-[12px] text-t-75 placeholder-t-20 transition-all"
                  />
                </div>
              </div>

              {/* Tags */}
              {allTags.length > 0 && (
                <FilterSection id="tags" label="Теги" icon={<Tag size={10} className="text-t-25" />} count={filterTags.length}>
                  <div className="flex flex-col gap-1">
                    {allTags.map((tag) => {
                      const active = filterTags.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => toggleTagFilter(tag.id)}
                          onContextMenu={(e) => { e.preventDefault(); setColorPicker({ x: e.clientX, y: e.clientY, currentColor: tag.color, type: 'tag', id: tag.id }); }}
                          className={`flex items-center gap-2 w-full text-left px-2 py-1 rounded-md text-[11px] transition-all ${
                            active
                              ? 'bg-t-08 text-t-85'
                              : 'text-t-45 hover:text-t-60 hover:bg-t-04'
                          }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="flex-1 truncate">{tag.name}</span>
                          {tagCounts[tag.id] && (
                            <span className="text-[10px] text-t-20 tabular-nums">{tagCounts[tag.id]}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </FilterSection>
              )}

              {/* Boards */}
              {boards.length > 1 && (
                <FilterSection id="boards" label="Доски" icon={<LayoutDashboard size={10} className="text-t-25" />} count={filterBoards.length}>
                  <div className="flex flex-col gap-1">
                    {boards.map((board) => {
                      const active = filterBoards.includes(board.id);
                      return (
                        <button
                          key={board.id}
                          onClick={() => toggleBoardFilter(board.id)}
                          onContextMenu={(e) => { e.preventDefault(); setColorPicker({ x: e.clientX, y: e.clientY, currentColor: board.color, type: 'board', id: board.id }); }}
                          className={`flex items-center gap-2 w-full text-left px-2 py-1 rounded-md text-[11px] transition-all ${
                            active
                              ? 'bg-t-08 text-t-85'
                              : 'text-t-45 hover:text-t-60 hover:bg-t-04'
                          }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: board.color }}
                          />
                          <span className="flex-1 truncate">{board.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </FilterSection>
              )}

              {/* Priority */}
              <FilterSection id="priority" label="Приоритет" icon={<span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-500 via-amber-500 to-red-500 flex-shrink-0" />} count={filterPriority.length}>
                <div className="flex flex-col gap-1">
                  {([1, 2, 3, 0] as Priority[]).map((p) => {
                    const active = filterPriority.includes(p);
                    const color = priorityColors[p] ?? (p === 0 ? '#6B7280' : PRIORITY_COLORS[p]);
                    return (
                      <button
                        key={p}
                        onClick={() => togglePriorityFilter(p)}
                        onContextMenu={(e) => { e.preventDefault(); setColorPicker({ x: e.clientX, y: e.clientY, currentColor: color, type: 'priority', id: String(p) }); }}
                        className={`flex items-center gap-2 w-full text-left px-2 py-1 rounded-md text-[11px] transition-all ${
                          active
                            ? 'bg-t-08 text-t-85'
                            : 'text-t-45 hover:text-t-60 hover:bg-t-04'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        {PRIORITY_LABELS[p]}
                      </button>
                    );
                  })}
                </div>
              </FilterSection>

              {/* Source */}
              <FilterSection id="source" label="Источник" icon={<Hand size={10} className="text-t-25" />} count={filterSource.length}>
                <div className="flex flex-col gap-1">
                  {SOURCES.map(({ value, label, icon }) => {
                    const active = filterSource.includes(value);
                    return (
                      <button
                        key={value}
                        onClick={() => toggleSourceFilter(value)}
                        className={`flex items-center gap-2 w-full text-left px-2 py-1 rounded-md text-[11px] transition-all ${
                          active
                            ? 'bg-t-08 text-t-85'
                            : 'text-t-45 hover:text-t-60 hover:bg-t-04'
                        }`}
                      >
                        <span className="flex-shrink-0 text-t-35">{icon}</span>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </FilterSection>

              {/* Reset */}
              {hasFilters && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1.5 text-[11px] text-t-30 hover:text-t-55 transition-colors mt-auto pt-2 border-t border-t-04"
                >
                  <RotateCcw size={10} />
                  Сбросить фильтры
                </button>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <StatsPanel />
            </div>
          )}
        </>
      )}
      {colorPicker && (
        <ColorPickerPopup
          x={colorPicker.x}
          y={colorPicker.y}
          currentColor={colorPicker.currentColor}
          onPick={handleColorPick}
          onClose={() => setColorPicker(null)}
        />
      )}
    </aside>
  );
});

export default Sidebar;
