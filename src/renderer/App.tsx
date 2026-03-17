import React, { useState, useEffect } from 'react';
import TitleBar from './components/Layout/TitleBar';
import KanbanBoard from './components/Board/KanbanBoard';
import StatusBar from './components/Layout/StatusBar';
import TaskCreateDialog from './components/Task/TaskCreateDialog';

export default function App() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [initialText, setInitialText] = useState('');
  const [initialFiles, setInitialFiles] = useState<string[]>([]);

  useEffect(() => {
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
    return () => {
      unsubText?.();
      unsubFiles?.();
      unsubDialog?.();
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
        <KanbanBoard />
      </main>
      <StatusBar />
      <TaskCreateDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        initialText={initialText}
        initialFiles={initialFiles}
      />
    </div>
  );
}
