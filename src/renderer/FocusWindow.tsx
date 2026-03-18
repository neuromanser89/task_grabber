import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X, GripHorizontal, Play, Pause, RotateCcw, Check, Plus,
  Trash2, ChevronDown, Timer, Clock, CheckSquare, Minimize2, Maximize2,
} from 'lucide-react';
import type { TaskWithAttachments } from '@shared/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CheckItem {
  id: string;
  text: string;
  done: boolean;
  fromMarkdown: boolean; // true = parsed from task.description
}

type PomodoroPhase = 'work' | 'break' | 'idle';

const WORK_DURATION = 25 * 60;
const BREAK_DURATION = 5 * 60;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}ч ${pad(m)}м`;
  if (m > 0) return `${m}м`;
  return `${seconds}с`;
}

// Parse markdown checklist items from description
function parseMarkdownChecklist(text: string): CheckItem[] {
  const lines = text.split('\n');
  const items: CheckItem[] = [];
  for (const line of lines) {
    const m = line.match(/^[\s]*[-*]\s+\[([ xX])\]\s+(.+)/);
    if (m) {
      items.push({
        id: `md_${items.length}`,
        text: m[2].trim(),
        done: m[1].toLowerCase() === 'x',
        fromMarkdown: true,
      });
    }
  }
  return items;
}

// Toggle checkbox in markdown text
function toggleMarkdownItem(text: string, index: number): string {
  let count = 0;
  return text.replace(/^([\s]*[-*]\s+)\[([ xX])\](\s+)/gm, (match, prefix, state, suffix) => {
    if (count === index) {
      count++;
      return `${prefix}[${state.trim() === '' ? 'x' : ' '}]${suffix}`;
    }
    count++;
    return match;
  });
}

function loadLocalChecklist(taskId: string): CheckItem[] {
  try {
    const raw = localStorage.getItem(`focus_checklist_${taskId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalChecklist(taskId: string, items: CheckItem[]) {
  localStorage.setItem(`focus_checklist_${taskId}`, JSON.stringify(items.filter((i) => !i.fromMarkdown)));
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function FocusWindow() {
  const [tasks, setTasks] = useState<TaskWithAttachments[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [isMini, setIsMini] = useState(false);

  // Pomodoro
  const [phase, setPhase] = useState<PomodoroPhase>('idle');
  const [timeLeft, setTimeLeft] = useState(WORK_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);

  // Time tracking — accumulated seconds in this window session
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [dbTotalTime, setDbTotalTime] = useState(0); // from DB at load
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [elapsedDisplay, setElapsedDisplay] = useState(0);

  // Checklist
  const [checklist, setChecklist] = useState<CheckItem[]>([]);
  const [newItemText, setNewItemText] = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Track seconds accumulated since last DB flush
  const pendingSecondsRef = useRef(0);
  const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  // ─── Load tasks ────────────────────────────────────────────────────────────

  async function loadTasks() {
    const result = (await window.electronAPI?.getTasks()) ?? [];
    setTasks(result as TaskWithAttachments[]);
  }

  useEffect(() => {
    loadTasks();
    const unsub = window.electronAPI?.onFocusSetTask?.((taskId) => setSelectedTaskId(taskId));
    return () => { unsub?.(); };
  }, []);

  // ─── Load checklist + time when task changes ───────────────────────────────

  useEffect(() => {
    if (!selectedTaskId) {
      setChecklist([]);
      setDbTotalTime(0);
      setSessionSeconds(0);
      return;
    }

    const task = tasks.find((t) => t.id === selectedTaskId);
    const mdItems = task?.description ? parseMarkdownChecklist(task.description) : [];
    const localItems = loadLocalChecklist(selectedTaskId);
    setChecklist([...mdItems, ...localItems]);

    window.electronAPI?.focusGetTotalTime?.(selectedTaskId).then((t: number) => setDbTotalTime(t ?? 0));
    setSessionSeconds(0);
  }, [selectedTaskId, tasks]);

  // ─── Flush time to DB every 30s ───────────────────────────────────────────

  useEffect(() => {
    flushIntervalRef.current = setInterval(() => {
      if (selectedTaskId && pendingSecondsRef.current > 0) {
        window.electronAPI?.focusUpdateTime?.(selectedTaskId, pendingSecondsRef.current);
        setDbTotalTime((t) => t + pendingSecondsRef.current);
        pendingSecondsRef.current = 0;
      }
    }, 30_000);
    return () => {
      if (flushIntervalRef.current) clearInterval(flushIntervalRef.current);
    };
  }, [selectedTaskId]);

  // ─── Pomodoro timer tick ───────────────────────────────────────────────────

  const handlePomodoroEnd = useCallback(() => {
    setIsRunning(false);
    if (phase === 'work') {
      // Send notification
      try {
        new Notification('Task Grabber — Помидор готов!', {
          body: 'Отличная работа! Перерыв 5 минут.',
          silent: false,
        });
      } catch { /* notifications may not work in all contexts */ }
      setPomodoroCount((c) => c + 1);
      setPhase('break');
      setTimeLeft(BREAK_DURATION);
      // Auto-start break
      setTimeout(() => setIsRunning(true), 500);
    } else {
      try {
        new Notification('Task Grabber — Перерыв закончился!', {
          body: 'Время вернуться к работе.',
          silent: false,
        });
      } catch { /* */ }
      setPhase('work');
      setTimeLeft(WORK_DURATION);
    }
  }, [phase]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            handlePomodoroEnd();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, handlePomodoroEnd]);

  // ─── Elapsed display + accumulate session seconds ─────────────────────────

  useEffect(() => {
    if (isRunning && phase === 'work' && sessionStart === null) {
      setSessionStart(Date.now());
    }
    if (!isRunning || phase === 'break') {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
      return;
    }

    elapsedRef.current = setInterval(() => {
      setElapsedDisplay((d) => d + 1);
      setSessionSeconds((s) => s + 1);
      pendingSecondsRef.current += 1;
    }, 1000);

    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, [isRunning, phase, sessionStart]);

  // ─── Session control ───────────────────────────────────────────────────────

  async function startSession() {
    if (selectedTaskId) {
      await window.electronAPI?.focusStart?.(selectedTaskId);
    }
    setPhase('work');
    setTimeLeft(WORK_DURATION);
    setIsRunning(true);
    setSessionStart(Date.now());
  }

  async function stopSession() {
    setIsRunning(false);
    // Flush remaining seconds
    if (selectedTaskId && pendingSecondsRef.current > 0) {
      await window.electronAPI?.focusUpdateTime?.(selectedTaskId, pendingSecondsRef.current);
      setDbTotalTime((t) => t + pendingSecondsRef.current);
      pendingSecondsRef.current = 0;
    }
    setSessionStart(null);
    setPhase('idle');
    setTimeLeft(WORK_DURATION);
    setElapsedDisplay(0);
  }

  async function completeTask() {
    if (!selectedTaskId) return;
    if (isRunning) setIsRunning(false);
    const totalPending = pendingSecondsRef.current;
    pendingSecondsRef.current = 0;
    await window.electronAPI?.focusComplete?.(selectedTaskId, totalPending);
    setSelectedTaskId(null);
    setPhase('idle');
    setTimeLeft(WORK_DURATION);
    setElapsedDisplay(0);
    loadTasks();
    window.electronAPI?.onTasksRefresh?.(() => {}); // trigger board refresh
    // Notify main
    window.electronAPI?.ipcSend('focus:openTask', ''); // signal board to refresh
  }

  function toggleTimer() {
    if (phase === 'idle') {
      startSession();
    } else {
      setIsRunning((r) => !r);
    }
  }

  function resetTimer() {
    setIsRunning(false);
    setPhase('work');
    setTimeLeft(WORK_DURATION);
  }

  // ─── Checklist ─────────────────────────────────────────────────────────────

  function addItem() {
    const text = newItemText.trim();
    if (!text || !selectedTaskId) return;
    const item: CheckItem = { id: `local_${Date.now()}`, text, done: false, fromMarkdown: false };
    const updated = [...checklist, item];
    setChecklist(updated);
    saveLocalChecklist(selectedTaskId, updated);
    setNewItemText('');
    inputRef.current?.focus();
  }

  function toggleItem(id: string) {
    if (!selectedTaskId) return;
    const idx = checklist.findIndex((i) => i.id === id);
    if (idx === -1) return;

    const item = checklist[idx];
    const updated = checklist.map((i) => (i.id === id ? { ...i, done: !i.done } : i));
    setChecklist(updated);

    if (item.fromMarkdown) {
      // Count which markdown item this is
      const mdItems = checklist.filter((i) => i.fromMarkdown);
      const mdIdx = mdItems.findIndex((i) => i.id === id);
      const task = tasks.find((t) => t.id === selectedTaskId);
      if (task?.description) {
        const newDesc = toggleMarkdownItem(task.description, mdIdx);
        window.electronAPI?.updateTask(selectedTaskId, { description: newDesc });
        // Update local task list optimistically
        setTasks((ts) => ts.map((t) => t.id === selectedTaskId ? { ...t, description: newDesc } : t));
      }
    } else {
      saveLocalChecklist(selectedTaskId, updated);
    }
  }

  function deleteItem(id: string) {
    if (!selectedTaskId) return;
    const item = checklist.find((i) => i.id === id);
    if (!item || item.fromMarkdown) return; // don't delete markdown items from here
    const updated = checklist.filter((i) => i.id !== id);
    setChecklist(updated);
    saveLocalChecklist(selectedTaskId, updated);
  }

  // ─── Timer display ─────────────────────────────────────────────────────────

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const phaseLabel = phase === 'work' ? 'Фокус' : phase === 'break' ? 'Перерыв' : 'Готов';
  const phaseColor = phase === 'work' ? '#EF4444' : phase === 'break' ? '#10B981' : '#3B82F6';
  const progress = phase === 'work'
    ? 1 - timeLeft / WORK_DURATION
    : phase === 'break'
    ? 1 - timeLeft / BREAK_DURATION
    : 0;

  const totalDisplayTime = dbTotalTime + sessionSeconds;
  const doneCount = checklist.filter((i) => i.done).length;

  // ─── Mini mode ─────────────────────────────────────────────────────────────

  if (isMini) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 bg-[#0F0F14]/95 backdrop-blur-xl text-white rounded-xl border border-t-08 select-none cursor-move"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div
          className="text-xl font-mono font-bold tabular-nums"
          style={{ color: phaseColor }}
        >
          {pad(mins)}:{pad(secs)}
        </div>
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={toggleTimer}
            className="w-6 h-6 flex items-center justify-center rounded-lg transition-all text-t-50 hover:text-t-90"
          >
            {isRunning ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button
            onClick={() => setIsMini(false)}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-t-25 hover:text-t-60 transition-all"
          >
            <Maximize2 size={11} />
          </button>
          <button
            onClick={() => window.electronAPI?.closeWindow()}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-t-20 hover:text-t-60 transition-all"
          >
            <X size={11} />
          </button>
        </div>
      </div>
    );
  }

  // ─── Full mode ─────────────────────────────────────────────────────────────

  return (
    <div className="relative flex flex-col h-screen bg-[#0F0F14]/95 backdrop-blur-xl text-white rounded-xl overflow-hidden border border-t-08 select-none">

      {/* Title bar */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-t-06 flex-shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal size={12} className="text-t-25" />
          <Timer size={12} className="text-t-40" />
          <span className="text-[11px] font-medium text-t-50">Focus Mode</span>
          {pomodoroCount > 0 && (
            <span className="text-[10px] text-t-25 bg-t-05 px-1.5 py-0.5 rounded-md">
              {pomodoroCount} 🍅
            </span>
          )}
        </div>
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={() => setIsMini(true)}
            className="w-5 h-5 flex items-center justify-center rounded text-t-20 hover:text-t-60 hover:bg-t-06 transition-all"
            title="Свернуть"
          >
            <Minimize2 size={10} />
          </button>
          <button
            onClick={() => window.electronAPI?.closeWindow()}
            className="w-5 h-5 flex items-center justify-center rounded text-t-20 hover:text-t-60 hover:bg-t-06 transition-all"
          >
            <X size={10} />
          </button>
        </div>
      </div>

      {/* Task picker */}
      <div className="px-3 pt-3 flex-shrink-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={() => setShowTaskPicker((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-t-04 hover:bg-t-08 border border-t-06 transition-all text-left"
        >
          <span className="text-[11px] text-t-60 truncate flex-1">
            {selectedTask ? selectedTask.title : 'Выбрать задачу...'}
          </span>
          <ChevronDown size={11} className={`text-t-30 flex-shrink-0 ml-1 transition-transform ${showTaskPicker ? 'rotate-180' : ''}`} />
        </button>

        {showTaskPicker && (
          <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-t-08 bg-[#1A1A22] z-10">
            <button
              onClick={() => { setSelectedTaskId(null); setShowTaskPicker(false); }}
              className="w-full text-left px-3 py-2 text-[11px] text-t-40 hover:bg-t-05 transition-colors border-b border-t-06"
            >
              Без задачи
            </button>
            {tasks.slice(0, 50).map((t) => (
              <button
                key={t.id}
                onClick={() => { setSelectedTaskId(t.id); setShowTaskPicker(false); }}
                className={`w-full text-left px-3 py-2 text-[11px] hover:bg-t-05 transition-colors truncate ${
                  t.id === selectedTaskId ? 'text-blue-400' : 'text-t-60'
                }`}
              >
                {t.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pomodoro timer */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="relative mx-auto" style={{ width: 110, height: 110 }}>
          <svg width="110" height="110" className="rotate-[-90deg]">
            <circle cx="55" cy="55" r="48" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
            <circle
              cx="55" cy="55" r="48" fill="none"
              stroke={phaseColor}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 48}`}
              strokeDashoffset={`${2 * Math.PI * 48 * (1 - progress)}`}
              style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.3s' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[22px] font-mono font-bold text-white tabular-nums">
              {pad(mins)}:{pad(secs)}
            </span>
            <span className="text-[9px] font-medium mt-0.5" style={{ color: phaseColor }}>
              {phaseLabel}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 mt-2.5">
          <button
            onClick={resetTimer}
            disabled={phase === 'idle'}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-t-30 hover:text-t-60 hover:bg-t-06 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <RotateCcw size={12} />
          </button>

          <button
            onClick={toggleTimer}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-all"
            style={{ backgroundColor: `${phaseColor}22`, color: phaseColor, border: `1px solid ${phaseColor}44` }}
          >
            {isRunning ? <Pause size={16} /> : <Play size={16} />}
          </button>

          <button
            onClick={stopSession}
            disabled={phase === 'idle'}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-t-30 hover:text-red-400 hover:bg-red-500/[0.08] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Остановить сессию"
          >
            <X size={12} />
          </button>
        </div>

        {/* Time info row */}
        <div className="flex items-center justify-center gap-3 mt-1.5">
          {elapsedDisplay > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-t-40">
              <Clock size={9} />
              <span className="tabular-nums">{formatDuration(elapsedDisplay)}</span>
            </div>
          )}
          {totalDisplayTime > 0 && (
            <div className="text-[10px] text-t-25 tabular-nums">
              итого: {formatDuration(totalDisplayTime)}
            </div>
          )}
        </div>

        {/* Done button */}
        {selectedTaskId && (
          <button
            onClick={completeTask}
            className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-400/80 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/50 transition-all text-[11px] font-medium"
          >
            <CheckSquare size={12} />
            Готово — завершить задачу
          </button>
        )}
      </div>

      <div className="flex-shrink-0 px-3 pb-1">
        <div className="h-px bg-t-05" />
      </div>

      {/* Checklist */}
      <div className="flex-1 flex flex-col overflow-hidden px-3 pb-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
          <span className="text-[10px] font-medium text-t-30 uppercase tracking-wider">
            Чеклист
          </span>
          {checklist.length > 0 && (
            <span className="text-[10px] text-t-25 tabular-nums">
              {doneCount}/{checklist.length}
            </span>
          )}
        </div>

        {!selectedTaskId ? (
          <p className="text-[11px] text-t-15 italic text-center py-3">Выберите задачу</p>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto flex flex-col gap-0.5 mb-2 min-h-0">
              {checklist.length === 0 && (
                <p className="text-[11px] text-t-15 italic text-center py-3">Нет пунктов</p>
              )}
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2 group px-1.5 py-1 rounded-lg hover:bg-t-03 transition-colors"
                >
                  <button
                    onClick={() => toggleItem(item.id)}
                    className={`w-4 h-4 flex-shrink-0 rounded border mt-px transition-all flex items-center justify-center ${
                      item.done
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-t-06 hover:border-t-10'
                    }`}
                  >
                    {item.done && <Check size={9} className="text-white" strokeWidth={3} />}
                  </button>
                  <span
                    className={`text-[11px] leading-snug flex-1 ${
                      item.done ? 'line-through text-t-25' : 'text-t-70'
                    }`}
                  >
                    {item.text}
                  </span>
                  {!item.fromMarkdown && (
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-t-20 hover:text-red-400 transition-all flex-shrink-0"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* New item input */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <input
                ref={inputRef}
                type="text"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addItem(); }}
                placeholder="Добавить пункт..."
                className="flex-1 bg-t-04 border border-t-08 rounded-lg px-2.5 py-1.5 text-[11px] text-t-70 placeholder-t-20 outline-none focus:border-t-20 focus:bg-t-06 transition-all"
              />
              <button
                onClick={addItem}
                disabled={!newItemText.trim()}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-t-04 hover:bg-t-08 border border-t-06 text-t-40 hover:text-t-70 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Plus size={12} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
