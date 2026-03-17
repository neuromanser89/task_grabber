import React from 'react';
import { X } from 'lucide-react';

interface BadgeProps {
  text: string;
  color?: string;
  removable?: boolean;
  onRemove?: () => void;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function Badge({ text, color = '#3B82F6', removable = false, onRemove }: BadgeProps) {
  const bgColor = hexToRgba(color, 0.15);

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: bgColor, color }}
    >
      {text}
      {removable && (
        <button
          onClick={e => { e.stopPropagation(); onRemove?.(); }}
          className="hover:opacity-70 transition-opacity flex-shrink-0"
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}
