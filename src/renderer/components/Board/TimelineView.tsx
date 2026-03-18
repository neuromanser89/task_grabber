import React, { useMemo, useState, useRef, useCallback } from 'react';
import { useTaskStore } from '../../stores/taskStore';
import { useColumnStore } from '../../stores/columnStore';
import type { TaskWithAttachments } from '@shared/types';
import TaskDetail from '../Task/TaskDetail';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const PRIORITY_COLORS: Record<number, string> = {
  0: '#6B7280',
  1: '#3B82F6',
  2: '#F59E0B',
  3: '#EF4444',
};

const ROW_H = 36;
const HEADER_H = 40;
const DAY_W = 40;
const LABEL_W = 200;

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay(); // 0=Sun
  r.setDate(r.getDate() - day + (day === 0 ? -6 : 1)); // Monday
  r.setHours(0, 0, 0, 0);
  return r;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatDay(d: Date): string {
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export default function TimelineView() {
  const { filteredTasks, updateTask } = useTaskStore();
  const { columns } = useColumnStore();
  const [selectedTask, setSelectedTask] = useState<TaskWithAttachments | null>(null);
  const [dragInfo, setDragInfo] = useState<{
    taskId: string;
    offsetDays: number;
    startX: number;
    originalStart: string;
    originalEnd: string;
  } | null>(null);

  // Track if bar was actually dragged (to suppress click → modal)
  const barDraggedRef = useRef(false);

  // Grab-scroll state
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const grabScrollRef = useRef<{ startX: number; scrollLeft: number } | null>(null);

  // Center on today
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [viewStart, setViewStart] = useState<Date>(() => addDays(today, -14));
  const DAYS = 60;

  const days = useMemo(() => {
    return Array.from({ length: DAYS }, (_, i) => addDays(viewStart, i));
  }, [viewStart]);

  const tasks = filteredTasks().filter((t) => !t.archived_at);

  // Tasks with dates (have due_date or created_at for positioning)
  const tasksWithDates = useMemo(() => {
    return tasks.map((t) => {
      const createdDate = t.created_at ? new Date(t.created_at) : today;
      createdDate.setHours(0, 0, 0, 0);
      const dueDate = t.due_date ? new Date(t.due_date) : null;
      if (dueDate) dueDate.setHours(0, 0, 0, 0);

      const startD = createdDate;
      const endD = dueDate ?? startD;

      return { task: t, startD, endD };
    });
  }, [tasks, today]);

  const colMap = useMemo(() => {
    const m: Record<string, string> = {};
    columns.forEach((c) => { m[c.id] = c.name; });
    return m;
  }, [columns]);

  const pan = useCallback((dir: number) => {
    setViewStart((d) => addDays(d, dir * 14));
  }, []);

  const goToday = useCallback(() => {
    setViewStart(addDays(today, -14));
  }, [today]);

  // Drag state for resizing/moving bars
  const containerRef = useRef<HTMLDivElement>(null);

  function getBarStyle(startD: Date, endD: Date): { left: number; width: number; visible: boolean } {
    const startOff = daysBetween(viewStart, startD);
    const endOff = daysBetween(viewStart, endD);
    const left = startOff * DAY_W;
    const width = Math.max((endOff - startOff + 1) * DAY_W, DAY_W);

    const totalW = DAYS * DAY_W;
    const visible = left + width > 0 && left < totalW;
    return { left, width, visible };
  }

  function handleBarMouseDown(
    e: React.MouseEvent,
    task: TaskWithAttachments,
    startD: Date,
    endD: Date
  ) {
    e.stopPropagation();
    barDraggedRef.current = false;
    const startX = e.clientX;
    setDragInfo({
      taskId: task.id,
      offsetDays: 0,
      startX,
      originalStart: isoDate(startD),
      originalEnd: isoDate(endD),
    });

    const onMove = (me: MouseEvent) => {
      const dx = me.clientX - startX;
      if (Math.abs(dx) > 3) barDraggedRef.current = true;
      const daysDelta = Math.round(dx / DAY_W);
      setDragInfo((prev) => prev ? { ...prev, offsetDays: daysDelta } : null);
    };

    const onUp = async (me: MouseEvent) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);

      const dx = me.clientX - startX;
      const daysDelta = Math.round(dx / DAY_W);

      if (daysDelta !== 0 && barDraggedRef.current) {
        // Always set due_date based on drag delta
        const baseEnd = task.due_date ? new Date(task.due_date) : new Date(task.created_at);
        baseEnd.setHours(0, 0, 0, 0);
        const newEnd = addDays(baseEnd, daysDelta);
        await updateTask(task.id, { due_date: isoDate(newEnd) });
      }
      setDragInfo(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  // Grab-scroll handlers on the grid background
  function handleGridMouseDown(e: React.MouseEvent) {
    // Only if clicking directly on the grid (not on a bar)
    if ((e.target as HTMLElement).closest('[data-bar]')) return;
    if (e.button !== 0) return;
    const el = gridScrollRef.current;
    if (!el) return;
    grabScrollRef.current = { startX: e.clientX, scrollLeft: el.scrollLeft };
    el.style.cursor = 'grabbing';
    e.preventDefault();

    const onMove = (me: MouseEvent) => {
      if (!grabScrollRef.current || !el) return;
      const dx = me.clientX - grabScrollRef.current.startX;
      el.scrollLeft = grabScrollRef.current.scrollLeft - dx;
    };
    const onUp = () => {
      grabScrollRef.current = null;
      if (el) el.style.cursor = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  const todayOffset = daysBetween(viewStart, today);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Controls */}
      <div className="relative flex items-center gap-2 px-4 py-2 border-b border-t-06 flex-shrink-0">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-blue/15 to-transparent pointer-events-none" />
        <button
          onClick={() => pan(-1)}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-t-08 text-t-40 hover:text-t-70 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => pan(1)}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-t-08 text-t-40 hover:text-t-70 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
        <button
          onClick={goToday}
          className="flex items-center gap-1.5 h-7 px-3 text-xs rounded-md hover:bg-t-08 text-t-50 hover:text-t-80 transition-colors"
        >
          <Calendar size={12} />
          Сегодня
        </button>
        <span className="text-xs text-t-30 ml-2">
          {formatDay(viewStart)} — {formatDay(addDays(viewStart, DAYS - 1))}
        </span>
        <span className="ml-auto text-xs text-t-25">
          Задач: {tasks.length} | Перетащи бар чтобы перенести дедлайн
        </span>
      </div>

      {/* Timeline grid */}
      <div ref={containerRef} className="flex flex-1 overflow-auto">
        {/* Left labels */}
        <div className="flex-shrink-0 sticky left-0 z-10" style={{ width: LABEL_W, background: 'var(--glass-heavy)' }}>
          {/* Header spacer */}
          <div style={{ height: HEADER_H }} className="border-b border-t-06 border-r border-t-06 flex items-center px-3">
            <span className="text-xs text-t-30 font-medium uppercase tracking-wide">Задача</span>
          </div>
          {/* Task label rows */}
          {tasksWithDates.map(({ task }) => (
            <div
              key={task.id}
              style={{ height: ROW_H }}
              className="flex items-center gap-2 px-3 border-b border-r border-t-04 cursor-pointer hover:bg-t-04 group"
              onClick={() => setSelectedTask(task)}
            >
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: PRIORITY_COLORS[task.priority ?? 0] }}
              />
              <span className="text-xs text-t-70 truncate group-hover:text-t-90 transition-colors flex-1">
                {task.title}
              </span>
              <span className="text-[10px] text-t-25 truncate max-w-[60px]">
                {colMap[task.column_id] ?? ''}
              </span>
            </div>
          ))}
        </div>

        {/* Scrollable grid */}
        <div
          ref={gridScrollRef}
          className="flex-1 overflow-x-auto"
          style={{ cursor: 'grab' }}
          onMouseDown={handleGridMouseDown}
        >
          <div style={{ width: DAYS * DAY_W, minWidth: DAYS * DAY_W }}>
            {/* Day headers */}
            <div
              className="flex border-b border-t-06 sticky top-0 z-10"
              style={{ height: HEADER_H, background: 'var(--glass-heavy)' }}
            >
              {days.map((d, i) => {
                const isToday = isoDate(d) === isoDate(today);
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div
                    key={i}
                    style={{ width: DAY_W, minWidth: DAY_W }}
                    className={`flex flex-col items-center justify-center border-r border-t-04 text-[9px] leading-tight flex-shrink-0 ${
                      isToday ? 'bg-accent-blue/10 text-accent-blue font-semibold' :
                      isWeekend ? 'text-t-25 bg-t-02' : 'text-t-35'
                    }`}
                  >
                    <span>{d.toLocaleDateString('ru-RU', { day: '2-digit' })}</span>
                    <span className="text-[8px] opacity-70">{d.toLocaleDateString('ru-RU', { month: 'short' })}</span>
                  </div>
                );
              })}
            </div>

            {/* Rows */}
            <div className="relative">
              {tasksWithDates.map(({ task, startD, endD }) => {
                const isDragging = dragInfo?.taskId === task.id;
                const adjustedStart = isDragging ? addDays(startD, dragInfo!.offsetDays) : startD;
                const adjustedEnd = isDragging ? addDays(endD, dragInfo!.offsetDays) : endD;
                const { left, width, visible } = getBarStyle(adjustedStart, adjustedEnd);
                const hasDue = !!task.due_date;

                return (
                  <div
                    key={task.id}
                    style={{ height: ROW_H }}
                    className="relative border-b border-t-04 flex items-center"
                  >
                    {/* Weekend bg */}
                    {days.map((d, i) => {
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      return isWeekend ? (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0 bg-t-02"
                          style={{ left: i * DAY_W, width: DAY_W }}
                        />
                      ) : null;
                    })}

                    {/* Today line */}
                    {todayOffset >= 0 && todayOffset < DAYS && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-accent-blue/30 z-10"
                        style={{ left: todayOffset * DAY_W + DAY_W / 2 }}
                      />
                    )}

                    {/* Task bar — drag changes due_date, no modal on click */}
                    {visible && (
                      <div
                        data-bar="1"
                        className={`absolute top-1/2 -translate-y-1/2 rounded-md flex items-center px-2 text-[11px] font-medium text-white
                          cursor-grab active:cursor-grabbing select-none transition-all duration-150
                          ${isDragging ? 'opacity-80 shadow-drag scale-[1.02]' : 'hover:brightness-110 hover:shadow-md'}`}
                        style={{
                          left: clamp(left, 0, DAYS * DAY_W - DAY_W),
                          width: Math.min(width, DAYS * DAY_W - clamp(left, 0, DAYS * DAY_W - DAY_W)),
                          height: ROW_H - 10,
                          backgroundColor: hasDue
                            ? PRIORITY_COLORS[task.priority ?? 0]
                            : `${PRIORITY_COLORS[task.priority ?? 0]}66`,
                          border: hasDue ? 'none' : `1px dashed ${PRIORITY_COLORS[task.priority ?? 0]}`,
                          zIndex: isDragging ? 20 : 5,
                        }}
                        onMouseDown={(e) => handleBarMouseDown(e, task, startD, endD)}
                        title={`${task.title}${hasDue ? ` — до ${task.due_date}` : ' (нет дедлайна — потяни чтобы установить)'}`}
                      >
                        <span className="truncate">{task.title}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {tasks.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-t-25 text-sm">Нет задач для отображения</p>
            <p className="text-t-15 text-xs mt-1">Создайте задачи с дедлайнами, они появятся на шкале</p>
          </div>
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
