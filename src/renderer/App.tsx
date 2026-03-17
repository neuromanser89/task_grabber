import React, { useState, useEffect, useCallback } from 'react';
import TitleBar from './components/Layout/TitleBar';
import KanbanBoard from './components/Board/KanbanBoard';
import StatusBar from './components/Layout/StatusBar';
import Sidebar from './components/Layout/Sidebar';
import TaskCreateDialog from './components/Task/TaskCreateDialog';
import QuickNoteDialog from './components/Notes/QuickNoteDialog';
import SettingsDialog from './components/Settings/SettingsDialog';
import { useNoteStore } from './stores/noteStore';

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
  const [initialText, setInitialText] = useState('');
  const [initialFiles, setInitialFiles] = useState<string[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const { fetchNotes } = useNoteStore();

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
    return () => {
      unsubText?.();
      unsubFiles?.();
      unsubDialog?.();
      unsubQuickNote?.();
    };
  }, []);

  const openCreateDialog = () => {
    setInitialText('');
    setInitialFiles([]);
    setShowCreateDialog(true);
  };

  const handleThemeChange = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
    window.electronAPI?.setSetting('theme', newTheme);
  }, []);

  const isDark = theme === 'dark' || (theme === 'system' && document.documentElement.classList.contains('dark'));

  return (
    <div className={`app-root flex flex-col h-screen select-none ${isDark ? 'bg-[#0F0F0F] text-white' : 'bg-[#F8F9FA] text-gray-900'}`}>
      <TitleBar onNewTask={openCreateDialog} onSettings={() => setShowSettings(true)} />
      <main className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((v) => !v)} />
        <KanbanBoard />
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
    </div>
  );
}
