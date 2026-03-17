import React from 'react';
import { Minus, Square, X, Plus } from 'lucide-react';

interface TitleBarProps {
  onNewTask?: () => void;
}

export default function TitleBar({ onNewTask }: TitleBarProps) {
  const minimize = () => window.electronAPI?.minimizeWindow();
  const maximize = () => window.electronAPI?.maximizeWindow();
  const close = () => window.electronAPI?.closeWindow();

  return (
    <div className="drag-region flex items-center justify-between h-10 bg-[#0F0F0F] border-b border-white/5 px-4 flex-shrink-0">
      <div className="flex items-center gap-2 no-drag">
        <div className="w-3 h-3 rounded-full bg-[#3B82F6]" />
        <span className="text-sm font-semibold text-white/80">Task Grabber</span>
      </div>

      <div className="flex items-center gap-2 no-drag">
        {onNewTask && (
          <button
            onClick={onNewTask}
            className="flex items-center gap-1.5 h-7 px-3 text-xs font-medium bg-gradient-to-r from-blue-500/80 to-purple-500/80 hover:from-blue-500 hover:to-purple-500 text-white rounded-md transition-all"
          >
            <Plus size={12} />
            Задача
          </button>
        )}

        <div className="flex items-center">
          <button
            onClick={minimize}
            className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded transition-colors"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={maximize}
            className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded transition-colors"
          >
            <Square size={12} />
          </button>
          <button
            onClick={close}
            className="w-8 h-8 flex items-center justify-center hover:bg-red-500/80 rounded transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
