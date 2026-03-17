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
          ? 'glass-heavy shadow-drag rotate-[1.5deg] scale-[1.02] border-white/15'
          : 'glass-card hover:bg-[#16162A]/80 hover:border-white/[0.08] hover:shadow-card-hover hover:-translate-y-[2px]'
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
        <p className="text-[13px] font-medium text-white/85 leading-snug line-clamp-2 flex-1">
          {task.title}
        </p>
        <span className="text-[10px] opacity-0 group-hover:opacity-40 transition-opacity duration-200 flex-shrink-0 mt-0.5">
          {SOURCE_EMOJI[task.source_type ?? 'manual']}
        </span>
      </div>

      {task.description && (
        <p className="text-[11px] text-white/30 mt-1.5 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between mt-2.5 text-[10px] text-white/20">
        <span className="transition-colors group-hover:text-white/30">{relativeTime(task.created_at)}</span>
        {hasAttachments && <span className="text-white/25">📎</span>}
      </div>
    </div>
  );
}
