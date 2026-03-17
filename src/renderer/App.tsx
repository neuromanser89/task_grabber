import React, { useState, useEffect } from 'react';
import TitleBar from './components/Layout/TitleBar';
import KanbanBoard from './components/Board/KanbanBoard';
import StatusBar from './components/Layout/StatusBar';
import Sidebar from './components/Layout/Sidebar';
import TaskCreateDialog from './components/Task/TaskCreateDialog';
import QuickNoteDialog from './components/Notes/QuickNoteDialog';
import { useNoteStore } from './stores/noteStore';

export default function App() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showQuickNote, setShowQuickNote] = useState(false);
  const [initialText, setInitialText] = useState('');
  const [initialFiles, setInitialFiles] = useState<string[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { fetchNotes } = useNoteStore();

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

  return (
    <div className="app-root flex flex-col h-screen bg-[#0F0F0F] text-white select-none">
      <TitleBar onNewTask={openCreateDialog} />
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
    </div>
  );
}
