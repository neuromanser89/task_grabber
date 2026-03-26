import React from 'react';
import { Minus, Square, X, Plus, Settings, Bot, LayoutList, Calendar, GanttChartSquare, Zap, FolderOpen, StickyNote, Stethoscope, Briefcase, Archive } from 'lucide-react';
import BoardSwitcher from '../Board/BoardSwitcher';
import appIcon from '../../app-icon.png';

export type ViewMode = 'kanban' | 'timeline' | 'calendar' | 'files' | 'notes' | 'projects' | 'archive';

interface TitleBarProps {
  onNewTask?: () => void;
  onSettings?: () => void;
  onAI?: () => void;
  onRules?: () => void;
  onDoctor?: () => void;
  viewMode?: ViewMode;
  onViewChange?: (mode: ViewMode) => void;
}

const VIEW_BUTTONS: { mode: ViewMode; label: string; Icon: React.ElementType }[] = [
  { mode: 'kanban', label: 'Канбан', Icon: LayoutList },
  { mode: 'timeline', label: 'Timeline', Icon: GanttChartSquare },
  { mode: 'calendar', label: 'Календарь', Icon: Calendar },
  { mode: 'notes', label: 'Заметки', Icon: StickyNote },
  { mode: 'files', label: 'Файлы', Icon: FolderOpen },
  { mode: 'projects', label: 'Проекты', Icon: Briefcase },
  { mode: 'archive', label: 'Архив', Icon: Archive },
];

export default function TitleBar({ onNewTask, onSettings, onAI, onRules, onDoctor, viewMode = 'kanban', onViewChange }: TitleBarProps) {
  const minimize = () => window.electronAPI?.minimizeWindow();
  const maximize = () => window.electronAPI?.maximizeWindow();
  const close = () => window.electronAPI?.closeWindow();

  return (
    <div className="drag-region relative z-30 flex items-center justify-between h-11 backdrop-blur-md px-4 flex-shrink-0" style={{ backgroundColor: 'var(--glass-heavy)' }}>
      {/* Gradient bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-blue/20 to-transparent" />

      <div className="flex items-center gap-2.5 no-drag">
        <img src={appIcon} alt="" className="w-5 h-5 flex-shrink-0" draggable={false} />
        <span className="text-sm font-semibold text-t-primary tracking-tight flex-shrink-0">
          Task Grabber
        </span>
        <div className="w-px h-4 bg-t-08 flex-shrink-0" />
        <BoardSwitcher />
      </div>

      {/* View switcher — center, responsive */}
      <div className="no-drag flex items-center gap-0.5 bg-t-06 rounded-lg p-0.5 mx-2 flex-shrink min-w-0 overflow-hidden">
        {VIEW_BUTTONS.map(({ mode, label, Icon }) => (
          <button
            key={mode}
            onClick={() => onViewChange?.(mode)}
            title={label}
            className={`flex items-center gap-1 h-6 px-2 text-[11px] font-medium rounded-md transition-all duration-150 flex-shrink-0
              ${viewMode === mode
                ? 'bg-accent-blue/80 text-white shadow-sm'
                : 'text-t-40 hover:text-t-70 hover:bg-t-06'
              }`}
          >
            <Icon size={11} strokeWidth={2} className="flex-shrink-0" />
            <span className="hidden xl:inline truncate">{label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 no-drag">
        {onNewTask && (
          <button
            onClick={onNewTask}
            title="Новая задача"
            className="flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium bg-gradient-to-r from-accent-blue/90 to-accent-purple/90 hover:from-accent-blue hover:to-accent-purple text-white rounded-md transition-all duration-200 hover:shadow-glow-blue active:scale-[0.97] flex-shrink-0"
          >
            <Plus size={12} strokeWidth={2.5} />
            <span className="hidden xl:inline">Задача</span>
          </button>
        )}
        {onRules && (
          <button
            onClick={onRules}
            className="w-7 h-7 flex items-center justify-center hover:bg-t-08 rounded-md transition-all duration-150 text-t-40 hover:text-accent-amber"
            title="Умные правила"
          >
            <Zap size={14} />
          </button>
        )}
        {onDoctor && (
          <button
            onClick={onDoctor}
            className="w-7 h-7 flex items-center justify-center hover:bg-t-08 rounded-md transition-all duration-150 text-t-40 hover:text-emerald-400"
            title="Task Doctor — аудит задач"
          >
            <Stethoscope size={14} />
          </button>
        )}
        {onAI && (
          <button
            onClick={onAI}
            className="w-7 h-7 flex items-center justify-center hover:bg-t-08 rounded-md transition-all duration-150 text-t-40 hover:text-accent-purple"
            title="AI Помощник"
          >
            <Bot size={14} />
          </button>
        )}
        {onSettings && (
          <button
            onClick={onSettings}
            className="w-7 h-7 flex items-center justify-center hover:bg-t-08 rounded-md transition-all duration-150 text-t-40 hover:text-t-70"
            title="Настройки"
          >
            <Settings size={14} />
          </button>
        )}

        <div className="flex items-center ml-1">
          <button
            onClick={minimize}
            className="w-8 h-8 flex items-center justify-center hover:bg-t-08 rounded-md transition-all duration-150 text-t-40 hover:text-t-70"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={maximize}
            className="w-8 h-8 flex items-center justify-center hover:bg-t-08 rounded-md transition-all duration-150 text-t-40 hover:text-t-70"
          >
            <Square size={11} />
          </button>
          <button
            onClick={close}
            className="w-8 h-8 flex items-center justify-center hover:bg-red-500/20 rounded-md transition-all duration-150 text-t-40 hover:text-red-400"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
