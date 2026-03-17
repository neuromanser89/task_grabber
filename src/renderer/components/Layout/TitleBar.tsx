import React from 'react';
import { Minus, Square, X, Plus, Settings } from 'lucide-react';

interface TitleBarProps {
  onNewTask?: () => void;
  onSettings?: () => void;
}

export default function TitleBar({ onNewTask, onSettings }: TitleBarProps) {
  const minimize = () => window.electronAPI?.minimizeWindow();
  const maximize = () => window.electronAPI?.maximizeWindow();
  const close = () => window.electronAPI?.closeWindow();

  return (
    <div className="drag-region relative flex items-center justify-between h-11 bg-bg-primary/80 backdrop-blur-md px-4 flex-shrink-0">
      {/* Gradient bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-blue/20 to-transparent" />

      <div className="flex items-center gap-2.5 no-drag">
        <div className="relative w-3.5 h-3.5">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent-blue to-accent-purple" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent-blue to-accent-purple animate-glow-pulse blur-sm opacity-50" />
        </div>
        <span className="text-sm font-semibold bg-gradient-to-r from-white/90 to-white/60 bg-clip-text text-transparent tracking-tight">
          Task Grabber
        </span>
      </div>

      <div className="flex items-center gap-2 no-drag">
        {onNewTask && (
          <button
            onClick={onNewTask}
            className="flex items-center gap-1.5 h-7 px-3 text-xs font-medium bg-gradient-to-r from-accent-blue/90 to-accent-purple/90 hover:from-accent-blue hover:to-accent-purple text-white rounded-md transition-all duration-200 hover:shadow-glow-blue active:scale-[0.97]"
          >
            <Plus size={12} strokeWidth={2.5} />
            Задача
          </button>
        )}
        {onSettings && (
          <button
            onClick={onSettings}
            className="w-7 h-7 flex items-center justify-center hover:bg-white/8 rounded-md transition-all duration-150 text-white/40 hover:text-white/70"
            title="Настройки"
          >
            <Settings size={14} />
          </button>
        )}

        <div className="flex items-center ml-1">
          <button
            onClick={minimize}
            className="w-8 h-8 flex items-center justify-center hover:bg-white/8 rounded-md transition-all duration-150 text-white/40 hover:text-white/70"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={maximize}
            className="w-8 h-8 flex items-center justify-center hover:bg-white/8 rounded-md transition-all duration-150 text-white/40 hover:text-white/70"
          >
            <Square size={11} />
          </button>
          <button
            onClick={close}
            className="w-8 h-8 flex items-center justify-center hover:bg-red-500/20 rounded-md transition-all duration-150 text-white/40 hover:text-red-400"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
