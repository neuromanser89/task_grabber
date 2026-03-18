import React, { useEffect, useState } from 'react';
import { BarChart2, Archive, RotateCcw, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import type { TaskStats, TaskWithAttachments } from '@shared/types';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@shared/constants';
import type { Priority } from '@shared/types';

export default function StatsPanel() {
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [archived, setArchived] = useState<TaskWithAttachments[]>([]);
  const [showArchive, setShowArchive] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    const s = await window.electronAPI?.getTaskStats();
    if (s) setStats(s);
  };

  const fetchArchived = async () => {
    setLoading(true);
    const tasks = (await window.electronAPI?.getArchivedTasks()) ?? [];
    setArchived(tasks);
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (showArchive) fetchArchived();
  }, [showArchive]);

  const handleUnarchive = async (id: string) => {
    await window.electronAPI?.unarchiveTask(id);
    setArchived((prev) => prev.filter((t) => t.id !== id));
    fetchStats();
  };

  if (!stats) {
    return <div className="text-t-20 text-[11px] py-4 text-center">Загрузка...</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-1.5">
        <StatCard icon={<BarChart2 size={11} />} label="Всего" value={stats.total} color="text-t-60" />
        <StatCard icon={<CheckCircle2 size={11} />} label="Готово" value={stats.completedTotal} color="text-emerald-400/70" />
        <StatCard icon={<Clock size={11} />} label="Сегодня" value={stats.createdToday} color="text-blue-400/70" />
        <StatCard icon={<TrendingUp size={11} />} label="За неделю" value={stats.createdThisWeek} color="text-violet-400/70" />
      </div>

      {/* By priority */}
      {stats.byPriority.length > 0 && (
        <div>
          <div className="text-[10px] font-medium text-t-25 uppercase tracking-wider mb-1.5">Приоритеты</div>
          <div className="flex flex-col gap-0.5">
            {stats.byPriority.map(({ priority, count }) => {
              const color = priority === 0 ? '#6B7280' : PRIORITY_COLORS[priority as Priority];
              const maxCount = Math.max(...stats.byPriority.map((b) => b.count), 1);
              const pct = Math.round((count / maxCount) * 100);
              return (
                <div key={priority} className="flex items-center gap-2">
                  <span className="text-[10px] text-t-30 w-[52px] truncate">{PRIORITY_LABELS[priority as Priority]}</span>
                  <div className="flex-1 h-1 bg-t-04 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: color + '99' }}
                    />
                  </div>
                  <span className="text-[10px] text-t-25 tabular-nums w-4 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* By column */}
      {stats.byColumn.length > 0 && (
        <div>
          <div className="text-[10px] font-medium text-t-25 uppercase tracking-wider mb-1.5">По колонкам</div>
          <div className="flex flex-col gap-0.5">
            {stats.byColumn.map(({ column_id, column_name, count }) => (
              <div key={column_id} className="flex items-center justify-between text-[11px]">
                <span className="text-t-40 truncate flex-1">{column_name}</span>
                <span className="text-t-25 tabular-nums ml-2">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Archive section */}
      <div className="border-t border-t-04 pt-2">
        <button
          onClick={() => setShowArchive((v) => !v)}
          className="flex items-center justify-between w-full text-[11px] text-t-30 hover:text-t-55 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Archive size={10} />
            Архив
            {stats.archivedTotal > 0 && (
              <span className="text-t-20">({stats.archivedTotal})</span>
            )}
          </span>
          <span className="text-[10px]">{showArchive ? '▲' : '▼'}</span>
        </button>

        {showArchive && (
          <div className="mt-2 flex flex-col gap-1 max-h-[200px] overflow-y-auto">
            {loading && <div className="text-[11px] text-t-20 text-center py-2">Загрузка...</div>}
            {!loading && archived.length === 0 && (
              <div className="text-[11px] text-t-15 text-center py-2">Архив пуст</div>
            )}
            {archived.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-2 p-1.5 rounded-lg bg-t-02 hover:bg-t-04 transition-colors group"
              >
                <span className="flex-1 text-[11px] text-t-30 truncate leading-tight mt-0.5">{task.title}</span>
                <button
                  onClick={() => handleUnarchive(task.id)}
                  title="Восстановить"
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-t-25 hover:text-t-60 transition-all"
                >
                  <RotateCcw size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 bg-t-03 border border-t-04 rounded-lg px-2.5 py-2">
      <div className={`flex items-center gap-1 ${color}`}>
        {icon}
        <span className="text-[10px] text-t-30">{label}</span>
      </div>
      <span className={`text-[18px] font-semibold tabular-nums leading-none ${color}`}>{value}</span>
    </div>
  );
}
