import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, GripHorizontal, Play, Pause, RotateCcw, Check, Plus, Trash2, ChevronDown, Timer, Clock } from 'lucide-react';
import type { TaskWithAttachments } from '@shared/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CheckItem {
  id: string;
  text: string;
  done: boolean;
}

type PomodoroPhase = 'work' | 'break' | 'idle';

const WORK_DURATION = 25 * 60; // 25 min in seconds
const BREAK_DURATION = 5 * 60; // 5 min in seconds

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}ч ${pad(m)}м`;
  if (m > 0) return `${m}м ${pad(s)}с`;
  return `${s}с`;
}

function loadChecklist(taskId: string): CheckItem[] {
  try {
    const raw = localStorage.getItem(`focus_checklist_${taskId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveChecklist(taskId: string, items: CheckItem[]) {
  localStorage.setItem(`focus_checklist_${taskId}`, JSON.stringify(items));
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function FocusWindow() {
  const [tasks, setTasks] = useState<TaskWithAttachments[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showTaskPicker, setShowTaskPicker] = useState(false);

  // Pomodoro
  const [phase, setPhase] = useState<PomodoroPhase>('idle');
  const [timeLeft, setTimeLeft] = useState(WORK_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);

  // Time tracking
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [totalTime, setTotalTime] = useState(0); // seconds logged to DB
  const [elapsedDisplay, setElapsedDisplay] = useState(0); // live elapsed in current session

  // Checklist
  const [checklist, setChecklist] = useState<CheckItem[]>([]);
  const [newItemText, setNewItemText] = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // ─── Load checklist when task changes ─────────────────────────────────────

  useEffect(() => {
    if (selectedTaskId) {
      setChecklist(loadChecklist(selectedTaskId));
      window.electronAPI?.focusGetTotalTime?.(selectedTaskId).then((t: number) => setTotalTime(t));
    } else {
      setChecklist([]);
      setTotalTime(0);
    }
  }, [selectedTaskId]);

  // ─── Pomodoro timer tick ───────────────────────────────────────────────────

  const handlePomodoroEnd = useCallback(() => {
    setIsRunning(false);
    if (phase === 'work') {
      setPomodoroCount((c) => c + 1);
      setPhase('break');
      setTimeLeft(BREAK_DURATION);
    } else {
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

  // ─── Elapsed display tick ──────────────────────────────────────────────────

  useEffect(() => {
    if (sessionStart !== null) {
      elapsedRef.current = setInterval(() => {
        setElapsedDisplay(Math.floor((Date.now() - sessionStart) / 1000));
      }, 1000);
    } else {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
      setElapsedDisplay(0);
    }
    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, [sessionStart]);

  // ─── Session control ───────────────────────────────────────────────────────

  async function startSession() {
    const sid = await window.electronAPI?.focusStart?.(selectedTaskId);
    if (sid) {
      setSessionId(sid.id);
      setSessionStart(Date.now());
    }
    setPhase('work');
    setTimeLeft(WORK_DURATION);
    setIsRunning(true);
  }

  async function stopSession() {
    setIsRunning(false);
    if (sessionId && sessionStart !== null) {
      const duration = Math.floor((Date.now() - sessionStart) / 1000);
      await window.electronAPI?.focusEnd?.(sessionId, duration, null);
      setTotalTime((t) => t + duration);
    }
    setSessionId(null);
    setSessionStart(null);
    setPhase('idle');
    setTimeLeft(WORK_DURATION);
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
    const item: CheckItem = { id: Date.now().toString(), text, done: false };
    const updated = [...checklist, item];
    setChecklist(updated);
    saveChecklist(selectedTaskId, updated);
    setNewItemText('');
    inputRef.current?.focus();
  }

  function toggleItem(id: string) {
    if (!selectedTaskId) return;
    const updated = checklist.map((i) => (i.id === id ? { ...i, done: !i.done } : i));
    setChecklist(updated);
    saveChecklist(selectedTaskId, updated);
  }

  function deleteItem(id: string) {
    if (!selectedTaskId) return;
    const updated = checklist.filter((i) => i.id !== id);
    setChecklist(updated);
    saveChecklist(selectedTaskId, updated);
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

  const doneCount = checklist.filter((i) => i.done).length;

  return (
    <div className="relative flex flex-col h-screen bg-[#0F0F14]/95 backdrop-blur-xl text-white rounded-xl overflow-hidden border border-white/[0.08] select-none">

      {/* Title bar */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] flex-shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal size={12} className="text-white/25" />
          <Timer size={12} className="text-white/40" />
          <span className="text-[11px] font-medium text-white/50">Focus Mode</span>
          {pomodoroCount > 0 && (
            <span className="text-[10px] text-white/25 bg-white/[0.05] px-1.5 py-0.5 rounded-md">
              {pomodoroCount} {pomodoroCount === 1 ? 'помидор' : 'помидора'}
            </span>
          )}
        </div>
        <button
          onClick={() => window.electronAPI?.closeWindow()}
          className="w-5 h-5 flex items-center justify-center rounded text-white/20 hover:text-white/60 hover:bg-white/[0.06] transition-all"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <X size={10} />
        </button>
      </div>

      {/* Task picker */}
      <div className="px-3 pt-3 flex-shrink-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={() => setShowTaskPicker((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] transition-all text-left"
        >
          <span className="text-[11px] text-white/60 truncate flex-1">
            {selectedTask ? selectedTask.title : 'Выбрать задачу...'}
          </span>
          <ChevronDown size={11} className={`text-white/30 flex-shrink-0 ml-1 transition-transform ${showTaskPicker ? 'rotate-180' : ''}`} />
        </button>

        {showTaskPicker && (
          <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-white/[0.08] bg-[#1A1A22] z-10">
            <button
              onClick={() => { setSelectedTaskId(null); setShowTaskPicker(false); }}
              className="w-full text-left px-3 py-2 text-[11px] text-white/40 hover:bg-white/[0.05] transition-colors border-b border-white/[0.05]"
            >
              Без задачи
            </button>
            {tasks.slice(0, 50).map((t) => (
              <button
                key={t.id}
                onClick={() => { setSelectedTaskId(t.id); setShowTaskPicker(false); }}
                className={`w-full text-left px-3 py-2 text-[11px] hover:bg-white/[0.05] transition-colors truncate ${
                  t.id === selectedTaskId ? 'text-blue-400' : 'text-white/60'
                }`}
              >
                {t.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pomodoro timer */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {/* Circular progress */}
        <div className="relative mx-auto" style={{ width: 120, height: 120 }}>
          <svg width="120" height="120" className="rotate-[-90deg]">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <circle
              cx="60" cy="60" r="52" fill="none"
              stroke={phaseColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 52}`}
              strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress)}`}
              style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.3s' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-mono font-bold text-white tabular-nums">
              {pad(mins)}:{pad(secs)}
            </span>
            <span className="text-[10px] font-medium mt-0.5" style={{ color: phaseColor }}>
              {phaseLabel}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 mt-3">
          <button
            onClick={resetTimer}
            disabled={phase === 'idle'}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <RotateCcw size={13} />
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
            disabled={phase === 'idle' && !sessionId}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/[0.08] transition-all disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-medium"
          >
            <X size={13} />
          </button>
        </div>

        {/* Time tracking display */}
        <div className="flex items-center justify-center gap-3 mt-2">
          {sessionStart !== null && (
            <div className="flex items-center gap-1 text-[10px] text-white/40">
              <Clock size={9} />
              <span className="tabular-nums">{formatDuration(elapsedDisplay)}</span>
            </div>
          )}
          {totalTime > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-white/25">
              <span>итого: {formatDuration(totalTime)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 px-3 pb-2">
        <div className="h-px bg-white/[0.05]" />
      </div>

      {/* Checklist */}
      <div className="flex-1 flex flex-col overflow-hidden px-3 pb-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="flex items-center justify-between mb-2 flex-shrink-0">
          <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">
            Чеклист
          </span>
          {checklist.length > 0 && (
            <span className="text-[10px] text-white/25 tabular-nums">
              {doneCount}/{checklist.length}
            </span>
          )}
        </div>

        {!selectedTaskId ? (
          <p className="text-[11px] text-white/15 italic text-center py-4">Выберите задачу для чеклиста</p>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto flex flex-col gap-1 mb-2">
              {checklist.length === 0 && (
                <p className="text-[11px] text-white/15 italic text-center py-3">Нет пунктов</p>
              )}
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2 group px-2 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors"
                >
                  <button
                    onClick={() => toggleItem(item.id)}
                    className={`w-4 h-4 flex-shrink-0 rounded border mt-px transition-all ${
                      item.done
                        ? 'bg-emerald-500 border-emerald-500 flex items-center justify-center'
                        : 'border-white/20 hover:border-white/40'
                    }`}
                  >
                    {item.done && <Check size={9} className="text-white" strokeWidth={3} />}
                  </button>
                  <span
                    className={`text-[12px] leading-snug flex-1 ${
                      item.done ? 'line-through text-white/25' : 'text-white/70'
                    }`}
                  >
                    {item.text}
                  </span>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all flex-shrink-0"
                  >
                    <Trash2 size={11} />
                  </button>
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
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[11px] text-white/70 placeholder-white/20 outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all"
              />
              <button
                onClick={addItem}
                disabled={!newItemText.trim()}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white/40 hover:text-white/70 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
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
