import React from 'react';
import type { TaskWithAttachments } from '@shared/types';
import { PRIORITY_COLORS } from '@shared/constants';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CalendarDays, Timer } from 'lucide-react';

interface Props {
  task: TaskWithAttachments;
  isDragOverlay?: boolean;
  isSelected?: boolean;
  onClick?: (task: TaskWithAttachments) => void;
}

const SOURCE_EMOJI: Record<string, string> = {
  manual: '✋',
  text: '📝',
  file: '📁',
  email: '✉️',
};

function countChecklist(text: string): [number, number] {
  const matches = text.match(/^[-*]\s+\[([ xX])\]/gm) ?? [];
  const done = matches.filter((m) => /\[([xX])\]/.test(m)).length;
  return [done, matches.length];
}

function formatDueDate(dateStr: string): { label: string; isOverdue: boolean; isToday: boolean } {
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  const isOverdue = diff < 0;
  const isToday = diff === 0;
  let label: string;
  if (isOverdue) label = `просрочено ${Math.abs(diff)}д`;
  else if (isToday) label = 'сегодня';
  else if (diff === 1) label = 'завтра';
  else label = due.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  return { label, isOverdue, isToday };
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins}м назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}ч назад`;
  return `${Math.floor(hrs / 24)}д назад`;
}

export default function TaskCard({ task, isDragOverlay = false, isSelected = false, onClick }: Props) {
  const priorityColor = PRIORITY_COLORS[task.priority ?? 0];
  const hasAttachments = false;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !isDragOverlay ? 0.25 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => { if (onClick && !isDragging) { e.stopPropagation(); onClick(task); } }}
      className={`group relative rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all duration-200 ${
        isDragOverlay
          ? 'glass-heavy shadow-drag rotate-[1.5deg] scale-[1.02] border-t-15'
          : isSelected
          ? 'glass-card bg-accent-blue/[0.06] border border-accent-blue/40 shadow-[0_0_12px_rgba(59,130,246,0.15),0_0_0_1px_rgba(59,130,246,0.25)] -translate-y-[1px]'
          : 'glass-card hover:border-t-08 hover:shadow-card-hover hover:-translate-y-[2px] hover:brightness-110'
      }`}
    >
      {/* Priority stripe with glow */}
      {task.priority > 0 && (
        <>
          <div
            className="absolute left-0 top-2.5 bottom-2.5 w-[2px] rounded-r-full"
            style={{ backgroundColor: priorityColor }}
          />
          <div
            className="absolute left-0 top-2.5 bottom-2.5 w-[2px] rounded-r-full blur-sm opacity-50"
            style={{ backgroundColor: priorityColor }}
          />
        </>
      )}

      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium text-t-85 leading-snug line-clamp-2 flex-1">
          {task.title}
        </p>
        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.electronAPI?.ipcSend('focus:openTask', task.id);
            }}
            className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity duration-200 text-white/40 hover:text-blue-400 p-0.5 rounded"
            title="Начать фокус-сессию"
          >
            <Timer size={11} />
          </button>
          <span className="text-[10px] opacity-0 group-hover:opacity-40 transition-opacity duration-200">
            {SOURCE_EMOJI[task.source_type ?? 'manual']}
          </span>
        </div>
      </div>

      {task.description && (() => {
        const [done, total] = countChecklist(task.description);
        if (total > 0) {
          // Show checklist progress bar instead of raw text
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          return (
            <div className="mt-1.5">
              <div className="flex items-center justify-between text-[10px] text-t-25 mb-1">
                <span>{done}/{total}</span>
                <span>{pct}%</span>
              </div>
              <div className="h-[3px] bg-t-06 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#10B981' : '#3B82F6' }}
                />
              </div>
            </div>
          );
        }
        return (
          <p className="text-[11px] text-t-30 mt-1.5 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        );
      })()}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {task.tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color,
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-2.5 text-[10px] text-t-20">
        <span className="transition-colors group-hover:text-t-30">{relativeTime(task.created_at)}</span>
        <div className="flex items-center gap-1.5">
          {(task as unknown as { time_spent?: number }).time_spent && (task as unknown as { time_spent?: number }).time_spent! > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-white/20">
              <Timer size={9} />
              {Math.round(((task as unknown as { time_spent: number }).time_spent) / 60)}м
            </span>
          )}
          {task.due_date && (() => {
            const { label, isOverdue, isToday } = formatDueDate(task.due_date);
            return (
              <span
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  isOverdue
                    ? 'bg-red-500/15 text-red-400/80'
                    : isToday
                    ? 'bg-amber-500/15 text-amber-400/80'
                    : 'bg-t-05 text-t-30'
                }`}
              >
                <CalendarDays size={9} />
                {label}
              </span>
            );
          })()}
          {hasAttachments && <span className="text-t-25">📎</span>}
        </div>
      </div>
    </div>
  );
}
