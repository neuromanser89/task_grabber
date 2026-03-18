import React, { useState, useEffect } from 'react';
import { X, AlertCircle, AlertTriangle, Stethoscope, CheckCircle2 } from 'lucide-react';
import type { Tag, TaskWithAttachments, Column } from '@shared/types';
import { PRIORITY_LABELS } from '@shared/constants';
import { useTaskStore } from '../../stores/taskStore';
import { useColumnStore } from '../../stores/columnStore';
import { countChecklist } from '../../utils/checklist';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type DiagId = 'overdue' | 'deadline_soon' | 'no_deadline' | 'empty_description' | 'stale_task' | 'no_tags' | 'no_priority' | 'abandoned_checklist';

interface DiagInfo {
  id: DiagId;
  label: string;
  severity: 'error' | 'warning';
}

interface SickTask {
  task: TaskWithAttachments;
  diagIds: DiagId[];
}

const TAG_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#F97316'];

/** Pure data diagnostics — no JSX, no callbacks */
function diagnoseTask(task: TaskWithAttachments, columns: Column[]): DiagInfo[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysSinceCreated = Math.floor((Date.now() - new Date(task.created_at).getTime()) / 86400000);
  const diags: DiagInfo[] = [];

  if (task.due_date && !task.archived_at) {
    const due = new Date(task.due_date); due.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.floor((due.getTime() - today.getTime()) / 86400000);
    if (daysUntilDue < 0) {
      diags.push({ id: 'overdue', label: `Просрочена на ${Math.abs(daysUntilDue)} дн.`, severity: 'error' });
    } else if (daysUntilDue <= 3 && !task.reminder_at) {
      diags.push({ id: 'deadline_soon', label: `Дедлайн через ${daysUntilDue === 0 ? 'сегодня' : daysUntilDue + ' дн.'} — нет напоминания`, severity: 'warning' });
    }
  }
  if (!task.due_date && !task.archived_at)
    diags.push({ id: 'no_deadline', label: 'Нет дедлайна', severity: task.priority >= 2 ? 'error' : 'warning' });
  if (!task.description || task.description.trim().length < 10)
    diags.push({ id: 'empty_description', label: 'Нет описания', severity: 'warning' });
  const col = columns.find((c) => c.id === task.column_id);
  if (col && col.sort_order === 0 && daysSinceCreated > 7 && !task.archived_at)
    diags.push({ id: 'stale_task', label: 'Задача завязла в начальной колонке', severity: 'warning' });
  if (task.tags.length === 0)
    diags.push({ id: 'no_tags', label: 'Нет тегов', severity: 'warning' });
  if (task.priority === 0 && task.description && task.description.length > 0)
    diags.push({ id: 'no_priority', label: 'Не задан приоритет', severity: 'warning' });
  if (task.description) {
    const [done, total] = countChecklist(task.description);
    if (total > 0 && done === 0 && daysSinceCreated > 3)
      diags.push({ id: 'abandoned_checklist', label: 'Чеклист заброшен (0%)', severity: 'warning' });
  }
  return diags;
}

/** Tag quick-fix: pick existing or create new */
function TagQuickFix({ taskId, allTags, onDone }: { taskId: string; allTags: Tag[]; onDone: () => void }) {
  const [newTagName, setNewTagName] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAddExisting = async (tag: Tag) => {
    await window.electronAPI?.addTagToTask?.(taskId, tag.id);
    onDone();
  };
  const handleCreate = async () => {
    const name = newTagName.trim();
    if (!name || adding) return;
    setAdding(true);
    try {
      const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
      const tag = await window.electronAPI?.createTag(name, color);
      if (tag) await window.electronAPI?.addTagToTask?.(taskId, tag.id);
      onDone();
    } finally { setAdding(false); }
  };

  return (
    <div className="mt-1 space-y-1.5">
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {allTags.map((tag) => (
            <button key={tag.id} className="px-2 py-0.5 text-xs rounded-full border transition-colors hover:brightness-125"
              style={{ borderColor: tag.color + '60', color: tag.color, backgroundColor: tag.color + '15' }}
              onClick={() => handleAddExisting(tag)}
            >{tag.name}</button>
          ))}
        </div>
      )}
      <div className="flex gap-1">
        <input type="text" value={newTagName} onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          placeholder="Новый тег..." className="flex-1 bg-t-04 border border-t-08 rounded px-2 py-0.5 text-xs text-t-75 placeholder-t-25 outline-none focus:border-accent-blue/50" />
        {newTagName.trim() && (
          <button onClick={handleCreate} disabled={adding}
            className="px-2 py-0.5 text-xs bg-accent-blue/20 text-accent-blue rounded border border-accent-blue/30 hover:bg-accent-blue/30 transition-colors">+</button>
        )}
      </div>
    </div>
  );
}

/** Render quick-fix widget for a diagnosis — always uses fresh callbacks */
function QuickFixWidget({ diagId, task, columns, allTags, onFix, onMove, onRemove }: {
  diagId: DiagId; task: TaskWithAttachments; columns: Column[]; allTags: Tag[];
  onFix: (patch: Record<string, unknown>) => void;
  onMove: (columnId: string) => void;
  onRemove: () => void;
}) {
  const fix = (patch: Record<string, unknown>) => { onFix(patch); onRemove(); };
  const dateBtns = (diagKey: string) => (
    <div className="flex flex-wrap gap-1 mt-1">
      {[{ label: 'Завтра', days: 1 }, { label: '+3д', days: 3 }, { label: '+7д', days: 7 }].map(({ label, days }) => {
        const d = new Date(); d.setDate(d.getDate() + days);
        return <button key={days} className="px-2 py-0.5 text-xs bg-t-04 border border-t-08 hover:bg-t-08 rounded transition-colors"
          onClick={() => fix({ due_date: d.toISOString().split('T')[0] })}>{label}</button>;
      })}
      <input type="date" className="px-2 py-0.5 text-xs bg-t-04 border border-t-08 rounded text-t-60"
        onChange={(e) => { if (e.target.value) fix({ due_date: e.target.value }); }} />
    </div>
  );

  const [descDraft, setDescDraft] = useState(task.description || '');

  const reminderBtns = () => (
    <div className="flex flex-wrap gap-1 mt-1">
      {[{ label: 'Через 1ч', hours: 1 }, { label: 'Через 3ч', hours: 3 }, { label: 'Завтра 9:00', hours: -1 }].map(({ label, hours }) => {
        return <button key={label} className="px-2 py-0.5 text-xs bg-t-04 border border-t-08 hover:bg-t-08 rounded transition-colors"
          onClick={() => {
            const d = new Date();
            if (hours === -1) { d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); }
            else d.setTime(d.getTime() + hours * 3600000);
            fix({ reminder_at: d.toISOString() });
          }}>{label}</button>;
      })}
    </div>
  );

  switch (diagId) {
    case 'overdue': return dateBtns('overdue');
    case 'deadline_soon': return reminderBtns();
    case 'no_deadline': return dateBtns('no_deadline');
    case 'empty_description': return (
      <div className="mt-1 flex flex-col gap-1">
        <textarea rows={2} placeholder="Добавь описание..." value={descDraft}
          onChange={(e) => setDescDraft(e.target.value)}
          className="w-full px-2 py-1 text-xs bg-t-04 border border-t-08 rounded resize-none text-t-80 placeholder:text-t-30 focus:border-accent-blue/50 outline-none" />
        {descDraft.trim().length > 0 && (
          <button onClick={() => fix({ description: descDraft.trim() })}
            className="self-end px-2 py-0.5 text-xs bg-accent-blue/20 text-accent-blue rounded border border-accent-blue/30 hover:bg-accent-blue/30 transition-colors"
          >Сохранить</button>
        )}
      </div>
    );
    case 'stale_task': return (
      <select className="mt-1 px-2 py-0.5 text-xs bg-t-04 border border-t-08 rounded text-t-60 appearance-none cursor-pointer"
        defaultValue="" onChange={(e) => { if (e.target.value) { onMove(e.target.value); onRemove(); } }}>
        <option value="" disabled>Перенести в...</option>
        {columns.filter((c) => c.id !== task.column_id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    );
    case 'no_tags': return <TagQuickFix taskId={task.id} allTags={allTags} onDone={onRemove} />;
    case 'no_priority': return (
      <div className="flex gap-1 mt-1">
        {([1, 2, 3] as const).map((p) => (
          <button key={p} className="px-2 py-0.5 text-xs bg-t-04 border border-t-08 hover:bg-t-08 rounded transition-colors"
            onClick={() => fix({ priority: p })}>{PRIORITY_LABELS[p]}</button>
        ))}
      </div>
    );
    case 'abandoned_checklist': return <span className="text-[10px] text-t-30 mt-1">Пересмотри чеклист или разбей задачу</span>;
    default: return null;
  }
}

const DIAG_ICON: Record<string, React.ReactNode> = {
  error: <AlertCircle size={14} />,
  warning: <AlertTriangle size={14} />,
};

export default function TaskDoctorDialog({ isOpen, onClose }: Props) {
  const { tasks, updateTask, moveTask } = useTaskStore();
  const { columns } = useColumnStore();
  const [sickTasks, setSickTasks] = useState<SickTask[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stats, setStats] = useState({ fixed: 0, skipped: 0, archived: 0 });
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsDone(false);
    setCurrentIndex(0);
    setStats({ fixed: 0, skipped: 0, archived: 0 });

    (async () => {
      const tags = (await window.electronAPI?.getTags?.() ?? []) as Tag[];
      setAllTags(tags);
      const active = tasks.filter((t) => !t.archived_at);
      const sick: SickTask[] = [];
      for (const task of active) {
        const diagInfos = diagnoseTask(task, columns);
        if (diagInfos.length > 0) sick.push({ task, diagIds: diagInfos.map((d) => d.id) });
      }
      setSickTasks(sick);
      if (sick.length === 0) setIsDone(true);
    })();
  }, [isOpen]);

  const handleFix = (taskId: string, patch: Record<string, unknown>) => {
    updateTask(taskId, patch as Parameters<typeof updateTask>[1]);
    setStats((s) => ({ ...s, fixed: s.fixed + 1 }));
  };

  const handleMove = (taskId: string, columnId: string) => {
    moveTask(taskId, columnId, 0);
    setStats((s) => ({ ...s, fixed: s.fixed + 1 }));
  };

  const removeDiag = (diagId: DiagId) => {
    setSickTasks((prev) => prev.map((st, i) =>
      i === currentIndex ? { ...st, diagIds: st.diagIds.filter((d) => d !== diagId) } : st
    ));
  };

  // Auto-advance when all diagnoses resolved
  useEffect(() => {
    const cur = sickTasks[currentIndex];
    if (cur && cur.diagIds.length === 0) advance('fixed');
  }, [sickTasks, currentIndex]);

  const advance = (action: 'skip' | 'archive' | 'fixed') => {
    if (action === 'skip') setStats((s) => ({ ...s, skipped: s.skipped + 1 }));
    if (action === 'archive') {
      const t = sickTasks[currentIndex]?.task;
      if (t) window.electronAPI?.archiveTask(t.id);
      setStats((s) => ({ ...s, archived: s.archived + 1 }));
    }
    const next = currentIndex + 1;
    if (next >= sickTasks.length) setIsDone(true);
    else setCurrentIndex(next);
  };

  if (!isOpen) return null;

  const current = sickTasks[currentIndex];
  const progress = sickTasks.length > 0 ? ((currentIndex + (isDone ? 0 : 0)) / sickTasks.length) * 100 : 100;
  const colName = current ? (columns.find((c) => c.id === current.task.column_id)?.name ?? '—') : '';

  // Rebuild diag infos from IDs for current task (always fresh)
  const currentDiags: DiagInfo[] = current
    ? diagnoseTask(current.task, columns).filter((d) => current.diagIds.includes(d.id))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-3xl mx-4 glass-heavy rounded-xl shadow-2xl animate-fade-in-scale">
        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-accent-blue/30 to-transparent rounded-full" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-t-06">
          <div className="flex items-center gap-2">
            <Stethoscope size={16} className="text-accent-blue" />
            <h2 className="text-[15px] font-semibold text-t-90 tracking-tight">Task Doctor</h2>
            {!isDone && sickTasks.length > 0 && (
              <span className="text-xs text-t-30 ml-1">{currentIndex + 1} / {sickTasks.length}</span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-1 mx-6">
            <div className="flex-1 h-1 bg-t-08 rounded-full overflow-hidden">
              <div className="h-full bg-accent-blue rounded-full transition-all duration-300" style={{ width: `${isDone ? 100 : progress}%` }} />
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-t-08 transition-all text-t-30 hover:text-t-60">
            <X size={13} />
          </button>
        </div>

        <div className="p-5">
          {isDone ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <CheckCircle2 size={48} className="text-green-400" />
              <h3 className="text-lg font-semibold text-t-90">Аудит завершён!</h3>
              <div className="flex gap-6 text-center">
                <div><div className="text-2xl font-bold text-accent-blue">{stats.fixed}</div><div className="text-xs text-t-30">исправлено</div></div>
                <div><div className="text-2xl font-bold text-t-60">{stats.skipped}</div><div className="text-xs text-t-30">пропущено</div></div>
                <div><div className="text-2xl font-bold text-amber-400">{stats.archived}</div><div className="text-xs text-t-30">архивировано</div></div>
              </div>
              {sickTasks.length === 0 && <p className="text-sm text-t-30">Все задачи в порядке</p>}
              <button onClick={onClose} className="px-4 py-2 bg-accent-blue hover:bg-accent-blue/80 text-white text-sm rounded-lg transition-colors">Закрыть</button>
            </div>
          ) : current ? (
            <div className="flex gap-4">
              {/* Left: task card */}
              <div className="w-1/2 glass-card rounded-lg p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-t-90 leading-snug">{current.task.title}</h3>
                  {current.task.priority > 0 && (
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style={{ backgroundColor: ['', '#3B82F615', '#F59E0B15', '#EF444415'][current.task.priority], color: ['', '#3B82F6', '#F59E0B', '#EF4444'][current.task.priority] }}
                    >{PRIORITY_LABELS[current.task.priority]}</span>
                  )}
                </div>
                {current.task.description && (
                  <p className="text-xs text-t-40 line-clamp-3 leading-relaxed">{current.task.description.replace(/[-*]\s+\[[ xX]\]/g, '').trim()}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-auto pt-2">
                  {current.task.tags.map((tag) => (
                    <span key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: tag.color + '20', color: tag.color }}>{tag.name}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-t-30">
                  <span>{colName}</span>
                  {current.task.due_date && (
                    <span className={new Date(current.task.due_date) < new Date() ? 'text-red-400' : ''}>
                      {new Date(current.task.due_date).toLocaleDateString('ru-RU')}
                    </span>
                  )}
                </div>
              </div>

              {/* Right: diagnoses — rendered dynamically with fresh callbacks */}
              <div className="w-1/2 flex flex-col gap-2">
                <p className="text-xs text-t-40 mb-1">Диагнозы:</p>
                <div className="flex flex-col gap-2 overflow-y-auto max-h-64">
                  {currentDiags.map((diag) => (
                    <div key={diag.id} className={`rounded-lg border p-3 ${diag.severity === 'error' ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                      <div className={`flex items-center gap-1.5 text-xs font-medium ${diag.severity === 'error' ? 'text-red-400' : 'text-amber-400'}`}>
                        {DIAG_ICON[diag.severity]}
                        {diag.label}
                      </div>
                      <QuickFixWidget
                        diagId={diag.id}
                        task={current.task}
                        columns={columns}
                        allTags={allTags}
                        onFix={(patch) => handleFix(current.task.id, patch)}
                        onMove={(colId) => handleMove(current.task.id, colId)}
                        onRemove={() => removeDiag(diag.id)}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-auto pt-3">
                  <button className="flex-1 px-3 py-1.5 text-xs bg-t-04 border border-t-08 hover:bg-t-08 rounded-lg transition-colors text-t-60"
                    onClick={() => advance('skip')}>Пропустить</button>
                  <button className="flex-1 px-3 py-1.5 text-xs bg-t-04 border border-t-08 hover:bg-amber-500/20 hover:border-amber-500/30 rounded-lg transition-colors text-t-60"
                    onClick={() => advance('archive')}>Архивировать</button>
                  <button className="flex-1 px-3 py-1.5 text-xs bg-accent-blue/20 border border-accent-blue/30 hover:bg-accent-blue/30 rounded-lg transition-colors text-accent-blue"
                    onClick={() => advance('skip')}>Далее →</button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
