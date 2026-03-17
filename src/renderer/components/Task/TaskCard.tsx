import React from 'react';
import type { Task } from '@shared/types';
import { PRIORITY_COLORS } from '@shared/constants';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  task: Task;
  isDragOverlay?: boolean;
  onClick?: (task: Task) => void;
}

const SOURCE_EMOJI: Record<string, string> = {
  manual: '✋',
  text: '📝',
  file: '📁',
  email: '✉️',
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins}м назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}ч назад`;
  return `${Math.floor(hrs / 24)}д назад`;
}

export default function TaskCard({ task, isDragOverlay = false, onClick }: Props) {
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
    opacity: isDragging && !isDragOverlay ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => { if (onClick && !isDragging) { e.stopPropagation(); onClick(task); } }}
      className={`group relative bg-[#0F0F1A] border border-white/5 rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all ${
        isDragOverlay
          ? 'shadow-2xl border-white/20 rotate-1 scale-105'
          : 'hover:bg-[#16162A] hover:border-white/10 hover:shadow-lg hover:-translate-y-0.5'
      }`}
    >
      {/* Priority stripe */}
      {task.priority > 0 && (
        <div
          className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r"
          style={{ backgroundColor: priorityColor }}
        />
      )}

      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-white/90 leading-snug line-clamp-2 flex-1">
          {task.title}
        </p>
        <span className="text-xs opacity-50 flex-shrink-0">
          {SOURCE_EMOJI[task.source_type ?? 'manual']}
        </span>
      </div>

      {task.description && (
        <p className="text-xs text-white/40 mt-1.5 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between mt-2 text-xs text-white/30">
        <span>{relativeTime(task.created_at)}</span>
        {hasAttachments && <span>📎</span>}
      </div>
    </div>
  );
}
