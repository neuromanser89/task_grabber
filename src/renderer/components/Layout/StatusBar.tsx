import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useTaskStore } from '../../stores/taskStore';
import { Keyboard, LayoutGrid, Minus, Plus, RotateCcw } from 'lucide-react';

const ZOOM_STEPS = [0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0];
const ZOOM_SETTING_KEY = 'ui_zoom';

export default function StatusBar() {
  const tasks = useTaskStore((s) => s.tasks);
  const searchQuery = useTaskStore((s) => s.searchQuery);
  const filterTags = useTaskStore((s) => s.filterTags);
  const filterPriority = useTaskStore((s) => s.filterPriority);
  const filterSource = useTaskStore((s) => s.filterSource);
  const filteredTasks = useTaskStore((s) => s.filteredTasks);
  const hasFilters = searchQuery.length > 0 || filterTags.length > 0 || filterPriority.length > 0 || filterSource.length > 0;

  const visible = useMemo(() => filteredTasks(), [tasks, searchQuery, filterTags, filterPriority, filterSource]);
  const today = new Date().toDateString();
  const todayCount = tasks.filter(
    (t) => new Date(t.created_at).toDateString() === today
  ).length;

  const [zoom, setZoomState] = useState(1.0);

  // Load saved zoom on mount
  useEffect(() => {
    window.electronAPI?.getSetting(ZOOM_SETTING_KEY).then((val) => {
      if (val) {
        const factor = parseFloat(val);
        if (factor >= 0.5 && factor <= 3.0) {
          setZoomState(factor);
          window.electronAPI?.setZoom(factor);
        }
      }
    });
  }, []);

  // Keyboard shortcuts: Ctrl+= zoom in, Ctrl+- zoom out, Ctrl+0 reset
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === '=' || e.key === '+') { e.preventDefault(); changeZoom(1); }
      else if (e.key === '-') { e.preventDefault(); changeZoom(-1); }
      else if (e.key === '0') { e.preventDefault(); applyZoom(1.0); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [zoom]);

  const applyZoom = useCallback((factor: number) => {
    setZoomState(factor);
    window.electronAPI?.setZoom(factor);
    window.electronAPI?.setSetting(ZOOM_SETTING_KEY, String(factor));
  }, []);

  const changeZoom = useCallback((dir: number) => {
    setZoomState((prev) => {
      const idx = ZOOM_STEPS.findIndex((s) => s >= prev - 0.01);
      const nextIdx = Math.max(0, Math.min(ZOOM_STEPS.length - 1, (idx === -1 ? ZOOM_STEPS.indexOf(1.0) : idx) + dir));
      const next = ZOOM_STEPS[nextIdx];
      window.electronAPI?.setZoom(next);
      window.electronAPI?.setSetting(ZOOM_SETTING_KEY, String(next));
      return next;
    });
  }, []);

  const pct = Math.round(zoom * 100);

  return (
    <div className="relative flex items-center gap-4 h-7 backdrop-blur-sm px-4 text-[11px] flex-shrink-0" style={{ background: 'var(--glass-heavy)', color: 'var(--text-muted)' }}>
      {/* Gradient top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-blue/10 to-transparent" />

      <span className="flex items-center gap-1.5">
        <LayoutGrid size={10} className="opacity-50" />
        {hasFilters ? (
          <span>
            <span className="text-accent-blue/70">{visible.length}</span>
            <span className="text-t-15"> / </span>
            {tasks.length} задач
          </span>
        ) : (
          `${tasks.length} задач`
        )}
      </span>
      <span className="text-t-15">|</span>
      <span>+{todayCount} сегодня</span>

      <span className="ml-auto flex items-center gap-3">
        {/* Zoom controls */}
        <span className="flex items-center gap-1 text-t-25">
          <button
            onClick={() => changeZoom(-1)}
            disabled={zoom <= ZOOM_STEPS[0]}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-t-08 hover:text-t-50 transition-colors disabled:opacity-20"
            title="Уменьшить (Ctrl+-)"
          >
            <Minus size={10} />
          </button>
          <button
            onClick={() => applyZoom(1.0)}
            className={`min-w-[36px] h-5 px-1 flex items-center justify-center rounded text-[10px] tabular-nums transition-colors ${
              pct === 100 ? 'text-t-25' : 'text-accent-blue/70 hover:bg-t-08'
            }`}
            title="Сбросить (Ctrl+0)"
          >
            {pct}%
          </button>
          <button
            onClick={() => changeZoom(1)}
            disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-t-08 hover:text-t-50 transition-colors disabled:opacity-20"
            title="Увеличить (Ctrl+=)"
          >
            <Plus size={10} />
          </button>
        </span>

        <span className="text-t-15">|</span>

        <span className="flex items-center gap-1.5 text-t-20">
          <Keyboard size={10} />
          <kbd className="px-1 py-0.5 bg-t-05 rounded text-[10px] font-mono">Ctrl+Shift+T</kbd>
          захватить текст
        </span>
      </span>
    </div>
  );
}
