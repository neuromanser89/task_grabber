import React, { useState, useRef } from 'react';
import type { Note } from '@shared/types';
import { useNoteStore } from '../../stores/noteStore';
import { Trash2, Edit3, Check, X } from 'lucide-react';

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins}м назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}ч назад`;
  return `${Math.floor(hrs / 24)}д назад`;
}

function NoteItem({ note }: { note: Note }) {
  const { updateNote, deleteNote } = useNoteStore();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(note.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const startEdit = () => {
    setValue(note.content);
    setEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const save = async () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== note.content) {
      await updateNote(note.id, trimmed);
    }
    setEditing(false);
  };

  const cancel = () => {
    setValue(note.content);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(); }
    if (e.key === 'Escape') cancel();
  };

  return (
    <div className="group glass-card rounded-lg p-3 transition-all duration-200 hover:border-t-08">
      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            className="w-full bg-transparent text-[13px] text-t-85 outline-none resize-none leading-relaxed"
          />
          <div className="flex gap-1 justify-end">
            <button
              onClick={save}
              className="p-1 rounded text-green-400/70 hover:text-green-400 hover:bg-t-05 transition-colors"
            >
              <Check size={12} />
            </button>
            <button
              onClick={cancel}
              className="p-1 rounded text-t-30 hover:text-t-60 hover:bg-t-05 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-[13px] text-t-75 leading-relaxed whitespace-pre-wrap break-words">
            {note.content}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-t-20">{relativeTime(note.created_at)}</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={startEdit}
                className="p-1 rounded text-t-30 hover:text-t-60 hover:bg-t-05 transition-colors"
              >
                <Edit3 size={11} />
              </button>
              <button
                onClick={() => deleteNote(note.id)}
                className="p-1 rounded text-t-30 hover:text-red-400/80 hover:bg-t-05 transition-colors"
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function NotesPanel() {
  const { notes } = useNoteStore();

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-t-20 text-[12px]">
        <p>Нет заметок</p>
        <p className="mt-1 text-[11px]">Ctrl+Shift+N — быстрая заметка</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {notes.map((note) => (
        <NoteItem key={note.id} note={note} />
      ))}
    </div>
  );
}
