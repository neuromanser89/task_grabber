import React, { useState, useEffect, useRef } from 'react';
import { useNoteStore } from '../../stores/noteStore';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickNoteDialog({ isOpen, onClose }: Props) {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { createNote } = useNoteStore();

  useEffect(() => {
    if (isOpen) {
      setText('');
      setTitle('');
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      onClose();
      return;
    }
    await createNote(trimmed, title.trim() || null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[200px] bg-accent-blue/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Dialog */}
      <div className="relative w-full max-w-md mx-4 glass-heavy rounded-xl border border-t-08 shadow-2xl overflow-hidden animate-fade-in-scale">
        {/* Top gradient line */}
        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-accent-blue/30 to-transparent rounded-full" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-t-06">
          <span className="text-[11px] font-medium text-t-50 uppercase tracking-wider">
            Быстрая заметка
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-t-08 transition-all duration-150 text-t-30 hover:text-t-60"
          >
            <X size={13} />
          </button>
        </div>

        {/* Title + Textarea */}
        <div className="p-4 flex flex-col gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Тема (опционально)"
            className="w-full bg-transparent text-[13px] font-semibold text-t-85 placeholder-t-20 outline-none border-b border-t-06 pb-1.5"
          />
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Пишешь и Enter — готово..."
            rows={4}
            className="w-full bg-transparent text-[14px] text-t-85 placeholder-t-20 outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Footer hint */}
        <div className="px-4 pb-3 flex items-center justify-between text-[11px] text-t-20">
          <span>Enter — сохранить · Shift+Enter — новая строка · Esc — отмена</span>
        </div>
      </div>
    </div>
  );
}
