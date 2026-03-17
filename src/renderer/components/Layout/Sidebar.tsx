import React, { useEffect, useState } from 'react';
import { Search, Tag, RotateCcw, ChevronLeft, ChevronRight, Hand, FileText, Folder, Mail, StickyNote } from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import { useNoteStore } from '../../stores/noteStore';
import type { Tag as TagType } from '@shared/types';
import { PRIORITY_LABELS, PRIORITY_COLORS } from '@shared/constants';
import type { Priority, SourceType } from '@shared/types';
import NotesPanel from '../Notes/NotesPanel';

const SOURCES: { value: SourceType; label: string; icon: React.ReactNode }[] = [
  { value: 'manual', label: 'Вручную', icon: <Hand size={11} /> },
  { value: 'text', label: 'Текст', icon: <FileText size={11} /> },
  { value: 'file', label: 'Файл', icon: <Folder size={11} /> },
  { value: 'email', label: 'Письмо', icon: <Mail size={11} /> },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: Props) {
  const {
    searchQuery, filterTags, filterPriority, filterSource,
    setSearch, toggleTagFilter, togglePriorityFilter, toggleSourceFilter, resetFilters,
    tasks,
  } = useTaskStore();

  const { notes } = useNoteStore();
  const [activeTab, setActiveTab] = useState<'filters' | 'notes'>('filters');
  const [allTags, setAllTags] = useState<TagType[]>([]);

  useEffect(() => {
    window.electronAPI?.getTags().then(setAllTags);
  }, [tasks]); // reload when tasks change (new tags might appear)

  const hasFilters = searchQuery || filterTags.length > 0 || filterPriority.length > 0 || filterSource.length > 0;

  // Count tasks per tag
  const tagCounts: Record<string, number> = {};
  for (const task of tasks) {
    for (const tag of task.tags) {
      tagCounts[tag.id] = (tagCounts[tag.id] ?? 0) + 1;
    }
  }

  return (
    <aside
      className={`flex flex-col flex-shrink-0 h-full border-r border-white/[0.05] transition-all duration-200 overflow-hidden bg-[#0F0F14]/70 backdrop-blur-md ${
        collapsed ? 'w-10' : 'w-[200px]'
      }`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-2 py-2.5 border-b border-white/[0.04]">
        {!collapsed && (
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('filters')}
              className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                activeTab === 'filters'
                  ? 'bg-white/[0.07] text-white/70'
                  : 'text-white/30 hover:text-white/55'
              }`}
            >
              Фильтры
              {hasFilters && <span className="ml-1 w-1.5 h-1.5 inline-block rounded-full bg-accent-blue align-middle" />}
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`text-[11px] px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                activeTab === 'notes'
                  ? 'bg-white/[0.07] text-white/70'
                  : 'text-white/30 hover:text-white/55'
              }`}
            >
              <StickyNote size={10} />
              {notes.length > 0 && <span className="text-white/25">{notes.length}</span>}
            </button>
          </div>
        )}
        <button
          onClick={onToggle}
          className="w-6 h-6 flex items-center justify-center rounded-md text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all ml-auto"
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
                  <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Поиск..."
                    className="w-full bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.1] focus:border-accent-blue/40 outline-none rounded-lg pl-7 pr-2.5 py-1.5 text-[12px] text-white/75 placeholder-white/20 transition-all"
                  />
                </div>
              </div>

              {/* Tags */}
              {allTags.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Tag size={10} className="text-white/25" />
                    <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">Теги</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {allTags.map((tag) => {
                      const active = filterTags.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => toggleTagFilter(tag.id)}
                          className={`flex items-center gap-2 w-full text-left px-2 py-1 rounded-md text-[11px] transition-all ${
                            active
                              ? 'bg-white/[0.08] text-white/85'
                              : 'text-white/45 hover:text-white/65 hover:bg-white/[0.04]'
                          }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="flex-1 truncate">{tag.name}</span>
                          {tagCounts[tag.id] && (
                            <span className="text-[10px] text-white/20 tabular-nums">{tagCounts[tag.id]}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Priority */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">Приоритет</span>
                </div>
                <div className="flex flex-col gap-1">
                  {([1, 2, 3, 0] as Priority[]).map((p) => {
                    const active = filterPriority.includes(p);
                    const color = p === 0 ? '#6B7280' : PRIORITY_COLORS[p];
                    return (
                      <button
                        key={p}
                        onClick={() => togglePriorityFilter(p)}
                        className={`flex items-center gap-2 w-full text-left px-2 py-1 rounded-md text-[11px] transition-all ${
                          active
                            ? 'bg-white/[0.08] text-white/85'
                            : 'text-white/45 hover:text-white/65 hover:bg-white/[0.04]'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        {PRIORITY_LABELS[p]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Source */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">Источник</span>
                </div>
                <div className="flex flex-col gap-1">
                  {SOURCES.map(({ value, label, icon }) => {
                    const active = filterSource.includes(value);
                    return (
                      <button
                        key={value}
                        onClick={() => toggleSourceFilter(value)}
                        className={`flex items-center gap-2 w-full text-left px-2 py-1 rounded-md text-[11px] transition-all ${
                          active
                            ? 'bg-white/[0.08] text-white/85'
                            : 'text-white/45 hover:text-white/65 hover:bg-white/[0.04]'
                        }`}
                      >
                        <span className="flex-shrink-0 text-white/35">{icon}</span>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reset */}
              {hasFilters && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/55 transition-colors mt-auto pt-2 border-t border-white/[0.04]"
                >
                  <RotateCcw size={10} />
                  Сбросить фильтры
                </button>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <NotesPanel />
            </div>
          )}
        </>
      )}
    </aside>
  );
}
