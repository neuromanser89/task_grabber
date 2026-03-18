import React, { useState, useEffect, useCallback, useRef } from 'react';
import TitleBar, { type ViewMode } from './components/Layout/TitleBar';
import KanbanBoard from './components/Board/KanbanBoard';
import TimelineView from './components/Board/TimelineView';
import CalendarView from './components/Board/CalendarView';
import StatusBar from './components/Layout/StatusBar';
import Sidebar, { type SidebarHandle } from './components/Layout/Sidebar';
import TaskCreateDialog from './components/Task/TaskCreateDialog';
import QuickNoteDialog from './components/Notes/QuickNoteDialog';
import SettingsDialog from './components/Settings/SettingsDialog';
import CommandPalette from './components/CommandPalette/CommandPalette';
import AIAssistantDialog from './components/AI/AIAssistantDialog';
import { ToastContainer, useToast } from './components/common/Toast';
import { useNoteStore } from './stores/noteStore';
import { useTaskStore } from './stores/taskStore';
import { useColumnStore } from './stores/columnStore';
// useColumnStore is used via getState() in instant capture callback

type Theme = 'dark' | 'light' | 'system';

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.remove('dark');
    root.classList.add('light');
  } else if (theme === 'dark') {
    root.classList.remove('light');
    root.classList.add('dark');
  } else {
    // system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.remove('light', 'dark');
    root.classList.add(prefersDark ? 'dark' : 'light');
  }
}

export default function App() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showQuickNote, setShowQuickNote] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [initialText, setInitialText] = useState('');
  const [initialFiles, setInitialFiles] = useState<string[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const { fetchNotes } = useNoteStore();
  const { createTask } = useTaskStore();
  const sidebarRef = useRef<SidebarHandle>(null);
  const { toasts, addToast, dismiss } = useToast();

  // Load theme from settings on mount
  useEffect(() => {
    window.electronAPI?.getSetting('theme').then((t) => {
      const saved = (t as Theme) || 'dark';
      setTheme(saved);
      applyTheme(saved);
    });
  }, []);

  // Listen for system theme changes when theme=system
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  useEffect(() => {
    fetchNotes();

    const unsubText = window.electronAPI?.onGrabText((text) => {
      setInitialText(text);
      setInitialFiles([]);
      setShowCreateDialog(true);
    });
    const unsubFiles = window.electronAPI?.onGrabFiles((files) => {
      setInitialFiles(files);
      setInitialText('');
      setShowCreateDialog(true);
    });
    const unsubDialog = window.electronAPI?.onShowCreateDialog(() => {
      setInitialText('');
      setInitialFiles([]);
      setShowCreateDialog(true);
    });
    const unsubQuickNote = window.electronAPI?.onShowQuickNote(() => {
      setShowQuickNote(true);
    });

    // Instant capture — create task immediately from clipboard
    const unsubInstant = window.electronAPI?.onGrabInstant?.(async (clipText) => {
      const cols = useColumnStore.getState().columns;
      const defaultCol = cols.find((c) => c.is_default) ?? cols[0];
      if (!defaultCol) return;

      const title = clipText
        ? clipText.split('\n')[0].trim().slice(0, 120) || 'Быстрая задача'
        : 'Быстрая задача';
      const description = clipText && clipText.includes('\n') ? clipText.trim() : clipText || null;

      const tasks = useTaskStore.getState().tasks.filter((t) => t.column_id === defaultCol.id);
      const sortOrder = tasks.length > 0 ? Math.max(...tasks.map((t) => t.sort_order)) + 1 : 0;

      try {
        const task = await createTask({
          title,
          description,
          column_id: defaultCol.id,
          sort_order: sortOrder,
          priority: 0,
          color: null,
          source_type: clipText ? 'text' : 'manual',
          source_info: null,
          due_date: null,
          archived_at: null,
          reminder_at: null,
        });
        addToast(`Задача создана: ${title}`, 'success', task.id);
      } catch {
        addToast('Не удалось создать задачу', 'error');
      }
    });

    // Screenshot capture hotkey
    const unsubScreenshot = window.electronAPI?.onScreenshotCapture?.(() => {
      setInitialText(`Screenshot ${new Date().toLocaleString('ru-RU')}`);
      setInitialFiles([]);
      setShowCreateDialog(true);
      addToast('Создайте задачу и прикрепите скриншот', 'info');
    });

    // Automation toasts
    const unsubAutomation = window.electronAPI?.onAutomationToast?.((message) => {
      addToast(message, 'info');
    });

    // Ctrl+K — Command Palette
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowPalette((v) => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubText?.();
      unsubFiles?.();
      unsubDialog?.();
      unsubQuickNote?.();
      unsubInstant?.();
      unsubScreenshot?.();
      unsubAutomation?.();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [fetchNotes, createTask, addToast]);

  const openCreateDialog = useCallback(() => {
    setInitialText('');
    setInitialFiles([]);
    setShowCreateDialog(true);
  }, []);

  const focusSearch = useCallback(() => {
    if (sidebarCollapsed) {
      setSidebarCollapsed(false);
      setTimeout(() => sidebarRef.current?.focusSearch(), 150);
    } else {
      sidebarRef.current?.focusSearch();
    }
  }, [sidebarCollapsed]);

  const handleThemeChange = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
    window.electronAPI?.setSetting('theme', newTheme);
  }, []);

  const handleToastTaskClick = useCallback((taskId: string) => {
    window.dispatchEvent(new CustomEvent('board:openTask', { detail: taskId }));
  }, []);

  const isDark = theme === 'dark' || (theme === 'system' && document.documentElement.classList.contains('dark'));

  return (
    <div className={`app-root flex flex-col h-screen select-none ${isDark ? 'bg-[#0F0F0F] text-white' : 'bg-[#F8F9FA] text-gray-900'}`}>
      <TitleBar
        onNewTask={openCreateDialog}
        onSettings={() => setShowSettings(true)}
        onAI={() => setShowAI(true)}
        viewMode={viewMode}
        onViewChange={setViewMode}
      />
      <main className="flex flex-1 overflow-hidden">
        <Sidebar ref={sidebarRef} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((v) => !v)} />
        {viewMode === 'kanban' && <KanbanBoard onCreateTask={openCreateDialog} onFocusSearch={focusSearch} />}
        {viewMode === 'timeline' && <TimelineView />}
        {viewMode === 'calendar' && <CalendarView />}
      </main>
      <StatusBar />
      <TaskCreateDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        initialText={initialText}
        initialFiles={initialFiles}
      />
      <QuickNoteDialog
        isOpen={showQuickNote}
        onClose={() => setShowQuickNote(false)}
      />
      <SettingsDialog
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onThemeChange={handleThemeChange}
        currentTheme={theme}
      />
      <CommandPalette
        isOpen={showPalette}
        onClose={() => setShowPalette(false)}
        onNewTask={openCreateDialog}
        onSettings={() => setShowSettings(true)}
        onAI={() => setShowAI(true)}
        onQuickNote={() => setShowQuickNote(true)}
        onThemeCycle={() => {
          const next = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
          handleThemeChange(next);
        }}
        currentTheme={theme}
      />
      <AIAssistantDialog
        isOpen={showAI}
        onClose={() => setShowAI(false)}
      />
      <ToastContainer toasts={toasts} onDismiss={dismiss} onTaskClick={handleToastTaskClick} />
    </div>
  );
}
