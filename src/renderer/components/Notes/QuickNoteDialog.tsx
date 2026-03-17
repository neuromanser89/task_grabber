import React, { useState, useEffect, useRef } from 'react';
import { useNoteStore } from '../../stores/noteStore';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickNoteDialog({ isOpen, onClose }: Props) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { createNote } = useNoteStore();

  useEffect(() => {
    if (isOpen) {
      setText('');
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
    await createNote(trimmed);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="relative w-full max-w-md mx-4 glass-heavy rounded-xl border border-white/[0.08] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <span className="text-[12px] font-medium text-white/50 uppercase tracking-wider">
            Быстрая заметка
          </span>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/60 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Textarea */}
        <div className="p-4">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Пишешь и Enter — готово..."
            rows={4}
            className="w-full bg-transparent text-[14px] text-white/85 placeholder-white/20 outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Footer hint */}
        <div className="px-4 pb-3 flex items-center justify-between text-[11px] text-white/20">
          <span>Enter — сохранить · Shift+Enter — новая строка · Esc — отмена</span>
        </div>
      </div>
    </div>
  );
}
