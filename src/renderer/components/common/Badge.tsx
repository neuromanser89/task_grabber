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
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] font-semibold tracking-wide border"
      style={{
        backgroundColor: hexToRgba(color, 0.1),
        color: color,
        borderColor: hexToRgba(color, 0.15),
      }}
    >
      {text}
      {removable && (
        <button
          onClick={e => { e.stopPropagation(); onRemove?.(); }}
          className="hover:opacity-60 transition-opacity duration-150 flex-shrink-0 ml-0.5"
        >
          <X size={9} />
        </button>
      )}
    </span>
  );
}
