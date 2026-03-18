import React, { useEffect, useState, useRef } from 'react';
import { Link2, X, Plus, Search } from 'lucide-react';
import type { Task } from '@shared/types';
import { useTaskStore } from '../../stores/taskStore';

interface Props {
  taskId: string;
}

export default function RelatedTasks({ taskId }: Props) {
  const [related, setRelated] = useState<Task[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { tasks } = useTaskStore();

  const fetchRelated = async () => {
    const r = (await window.electronAPI?.getRelatedTasks(taskId)) ?? [];
    setRelated(r);
  };

  useEffect(() => {
    fetchRelated();
  }, [taskId]);

  useEffect(() => {
    if (showSearch) inputRef.current?.focus();
  }, [showSearch]);

  const handleAdd = async (relatedId: string) => {
    if (relatedId === taskId) return;
    if (related.some((r) => r.id === relatedId)) return;
    await window.electronAPI?.addRelatedTask(taskId, relatedId);
    fetchRelated();
    setShowSearch(false);
    setQuery('');
  };

  const handleRemove = async (relatedId: string) => {
    await window.electronAPI?.removeRelatedTask(taskId, relatedId);
    setRelated((prev) => prev.filter((r) => r.id !== relatedId));
  };

  const relatedIds = new Set(related.map((r) => r.id));
  const suggestions = tasks.filter(
    (t) =>
      t.id !== taskId &&
      !relatedIds.has(t.id) &&
      (query.trim() === '' || t.title.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 6);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[11px] font-medium text-t-35 uppercase tracking-wider flex items-center gap-1.5">
          <Link2 size={10} />
          Связанные задачи
        </label>
        <button
          onClick={() => setShowSearch((v) => !v)}
          className="flex items-center gap-1 text-[11px] text-t-25 hover:text-t-50 transition-colors"
        >
          <Plus size={11} />
        </button>
      </div>

      {related.length === 0 && !showSearch && (
        <div className="text-[11px] text-t-15">Нет связанных задач</div>
      )}

      {related.length > 0 && (
        <div className="flex flex-col gap-1 mb-2">
          {related.map((r) => (
            <div key={r.id} className="flex items-center gap-2 group">
              <div className="w-1.5 h-1.5 rounded-full bg-t-20 flex-shrink-0" />
              <span className="flex-1 text-[12px] text-t-50 truncate">{r.title}</span>
              <button
                onClick={() => handleRemove(r.id)}
                className="opacity-0 group-hover:opacity-100 text-t-25 hover:text-t-60 transition-all flex-shrink-0"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showSearch && (
        <div className="relative">
          <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-t-25 pointer-events-none" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') { setShowSearch(false); setQuery(''); } }}
            placeholder="Найти задачу..."
            className="w-full bg-t-04 border border-t-06 hover:border-t-10 focus:border-accent-blue/40 outline-none rounded-lg pl-7 pr-2.5 py-1.5 text-[12px] text-t-75 placeholder-t-20 transition-all"
          />
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 glass-heavy border border-t-08 rounded-lg overflow-hidden z-50 shadow-2xl max-h-[180px] overflow-y-auto">
              {suggestions.map((t) => (
                <button
                  key={t.id}
                  onMouseDown={(e) => { e.preventDefault(); handleAdd(t.id); }}
                  className="w-full text-left px-3 py-2 text-[12px] text-t-60 hover:bg-t-06 hover:text-t-85 transition-colors truncate"
                >
                  {t.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
