import React from 'react';
import { useTaskStore } from '../../stores/taskStore';
import { Keyboard, LayoutGrid } from 'lucide-react';

export default function StatusBar() {
  const tasks = useTaskStore((s) => s.tasks);
  const filteredTasks = useTaskStore((s) => s.filteredTasks);
  const hasFilters = useTaskStore(
    (s) =>
      s.searchQuery.length > 0 ||
      s.filterTags.length > 0 ||
      s.filterPriority.length > 0 ||
      s.filterSource.length > 0
  );

  const visible = filteredTasks();
  const today = new Date().toDateString();
  const todayCount = tasks.filter(
    (t) => new Date(t.created_at).toDateString() === today
  ).length;

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
      <span className="ml-auto flex items-center gap-1.5 text-t-20">
        <Keyboard size={10} />
        <kbd className="px-1 py-0.5 bg-t-05 rounded text-[10px] font-mono">Ctrl+Shift+T</kbd>
        захватить текст
      </span>
    </div>
  );
}
