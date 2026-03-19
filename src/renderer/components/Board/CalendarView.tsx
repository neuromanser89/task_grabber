import React, { useMemo, useState, useCallback } from 'react';
import { useTaskStore } from '../../stores/taskStore';
import { useColumnStore } from '../../stores/columnStore';
import type { TaskWithAttachments, ColumnType } from '@shared/types';
import { COLUMN_TYPE_STATUS } from '@shared/constants';
import TaskDetail from '../Task/TaskDetail';
import { ChevronLeft, ChevronRight, Circle, Loader, PauseCircle, CheckCircle2, XCircle } from 'lucide-react';

const PRIORITY_COLORS: Record<number, string> = {
  0: '#6B7280',
  1: '#3B82F6',
  2: '#F59E0B',
  3: '#EF4444',
};

const WEEKDAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthStart(year: number, month: number): Date {
  return new Date(year, month, 1);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Returns Monday-based index 0-6
function dayOfWeekMon(d: Date): number {
  return (d.getDay() + 6) % 7;
}

interface DragState {
  taskId: string;
  overDate: string | null;
}

export default function CalendarView() {
  const { filteredTasks, updateTask } = useTaskStore();
  const { columns } = useColumnStore();
  const [selectedTask, setSelectedTask] = useState<TaskWithAttachments | null>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed

  const [drag, setDrag] = useState<DragState | null>(null);

  const tasks = filteredTasks().filter((t) => !t.archived_at);

  const colMap = useMemo(() => {
    const m: Record<string, string> = {};
    columns.forEach((c) => { m[c.id] = c.name; });
    return m;
  }, [columns]);

  const colTypeMap = useMemo(() => {
    const m: Record<string, ColumnType> = {};
    columns.forEach((c) => { if (c.column_type) m[c.id] = c.column_type; });
    return m;
  }, [columns]);

  // Build calendar grid (6 weeks max)
  const grid = useMemo(() => {
    const first = monthStart(year, month);
    const startOffset = dayOfWeekMon(first); // 0=Mon, pad from Monday
    const totalDays = daysInMonth(year, month);

    // Fill cells: nulls for prev-month padding, dates for current month, nulls for end padding
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) {
      cells.push(new Date(year, month, d));
    }
    // Pad to complete last week
    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
  }, [year, month]);

  // Group tasks by due_date ISO string
  const tasksByDate = useMemo(() => {
    const map: Record<string, TaskWithAttachments[]> = {};
    tasks.forEach((t) => {
      if (t.due_date) {
        const key = t.due_date.slice(0, 10);
        if (!map[key]) map[key] = [];
        map[key].push(t);
      }
    });
    return map;
  }, [tasks]);

  const prevMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 0) { setYear((y) => y - 1); return 11; }
      return m - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 11) { setYear((y) => y + 1); return 0; }
      return m + 1;
    });
  }, []);

  const goToday = useCallback(() => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }, [today]);

  // Drag & drop handlers
  function handleDragStart(e: React.DragEvent, task: TaskWithAttachments) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('taskId', task.id);
    setDrag({ taskId: task.id, overDate: null });
  }

  function handleDragOver(e: React.DragEvent, dateStr: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDrag((prev) => prev ? { ...prev, overDate: dateStr } : null);
  }

  function handleDragLeave() {
    setDrag((prev) => prev ? { ...prev, overDate: null } : null);
  }

  async function handleDrop(e: React.DragEvent, dateStr: string) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) { setDrag(null); return; }
    await updateTask(taskId, { due_date: dateStr });
    setDrag(null);
  }

  function handleDragEnd() {
    setDrag(null);
  }

  const monthName = new Date(year, month, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

  const todayStr = isoDate(today);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header controls */}
      <div className="relative flex items-center gap-2 px-4 py-2 border-b border-t-06 flex-shrink-0">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-blue/15 to-transparent pointer-events-none" />
        <button
          onClick={prevMonth}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-t-08 text-t-40 hover:text-t-70 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={nextMonth}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-t-08 text-t-40 hover:text-t-70 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
        <span className="text-sm font-semibold text-t-80 capitalize ml-1">{monthName}</span>
        <button
          onClick={goToday}
          className="ml-2 h-7 px-3 text-xs rounded-md hover:bg-t-08 text-t-50 hover:text-t-80 transition-colors"
        >
          Сегодня
        </button>
        <span className="ml-auto text-xs text-t-25">
          Задач с дедлайном в месяце: {
            Object.keys(tasksByDate).filter((k) => k.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).reduce((sum, k) => sum + tasksByDate[k].length, 0)
          }
        </span>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto p-3">
        {/* Weekday labels */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS_RU.map((wd) => (
            <div
              key={wd}
              className={`text-center text-[11px] font-medium py-1 ${
                wd === 'Сб' || wd === 'Вс' ? 'text-t-25' : 'text-t-40'
              }`}
            >
              {wd}
            </div>
          ))}
        </div>

        {/* Cells */}
        <div className="grid grid-cols-7 gap-1">
          {grid.map((cellDate, idx) => {
            if (!cellDate) {
              return <div key={`empty-${idx}`} className="rounded-lg h-28 bg-t-02 opacity-30" />;
            }

            const dateStr = isoDate(cellDate);
            const isToday = dateStr === todayStr;
            const isWeekend = cellDate.getDay() === 0 || cellDate.getDay() === 6;
            const isOtherMonth = cellDate.getMonth() !== month;
            const dayTasks = tasksByDate[dateStr] ?? [];
            const isOver = drag?.overDate === dateStr;

            return (
              <div
                key={dateStr}
                className={`rounded-lg min-h-[7rem] p-1.5 border transition-colors flex flex-col
                  ${isToday
                    ? 'border-accent-blue/40 bg-accent-blue/5'
                    : isWeekend
                    ? 'border-t-04 bg-t-02'
                    : 'border-t-04 bg-t-03'}
                  ${isOtherMonth ? 'opacity-50' : ''}
                  ${isOver ? 'border-accent-blue/50 bg-accent-blue/10' : ''}
                `}
                onDragOver={(e) => handleDragOver(e, dateStr)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, dateStr)}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full
                      ${isToday ? 'bg-accent-blue text-white' : isWeekend ? 'text-t-30' : 'text-t-50'}
                    `}
                  >
                    {cellDate.getDate()}
                  </span>
                </div>

                {/* Tasks in cell */}
                <div className="flex flex-col gap-0.5 flex-1">
                  {dayTasks.slice(0, 3).map((task) => {
                    const ct = colTypeMap[task.column_id];
                    const status = ct ? COLUMN_TYPE_STATUS[ct] : null;
                    const isDone = ct === 'done' || ct === 'cancelled';
                    const StatusIcon = ct === 'in_progress' ? Loader : ct === 'waiting' ? PauseCircle : ct === 'done' ? CheckCircle2 : ct === 'cancelled' ? XCircle : Circle;
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
                        className={`text-[10px] px-1.5 py-0.5 rounded cursor-grab active:cursor-grabbing truncate leading-tight
                          hover:brightness-110 hover:shadow-sm transition-all duration-150 select-none flex items-center gap-1
                          ${drag?.taskId === task.id ? 'opacity-50' : ''}
                          ${isDone ? 'opacity-60' : ''}`}
                        style={{
                          backgroundColor: isDone && status ? status.color : PRIORITY_COLORS[task.priority ?? 0],
                          color: 'white',
                          boxShadow: `0 1px 3px ${PRIORITY_COLORS[task.priority ?? 0]}30`,
                        }}
                        title={`${task.title} [${colMap[task.column_id] ?? ''}]${status ? ` — ${status.label}` : ''}`}
                      >
                        <StatusIcon size={8} className={`flex-shrink-0 ${ct === 'in_progress' ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
                        <span className={`truncate ${isDone ? 'line-through' : ''}`}>{task.title}</span>
                      </div>
                    );
                  })}
                  {dayTasks.length > 3 && (
                    <div className="text-[9px] text-t-30 px-1">
                      +{dayTasks.length - 3} ещё
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tasks without due_date notice */}
      {tasks.filter((t) => !t.due_date).length > 0 && (
        <div className="px-4 py-1.5 border-t border-t-04 text-[11px] text-t-25 flex-shrink-0">
          {tasks.filter((t) => !t.due_date).length} задач без дедлайна — не отображаются в календаре
        </div>
      )}

      <TaskDetail
        task={selectedTask}
        isOpen={selectedTask !== null}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  );
}
