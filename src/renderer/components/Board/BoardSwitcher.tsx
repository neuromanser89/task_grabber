import React, { useState, useRef, useEffect } from 'react';
import { Plus, ChevronDown, Pencil, Trash2, Check, X } from 'lucide-react';
import { useBoardStore } from '../../stores/boardStore';
import type { Board } from '@shared/types';

const BOARD_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#14B8A6', '#F97316',
];

export default function BoardSwitcher() {
  const { boards, activeBoardId, setActiveBoard, createBoard, updateBoard, deleteBoard } = useBoardStore();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(BOARD_COLORS[0]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const activeBoard = boards.find((b) => b.id === activeBoardId);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        setEditId(null);
        setDeleteConfirm(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (creating && newInputRef.current) newInputRef.current.focus();
  }, [creating]);

  useEffect(() => {
    if (editId && editInputRef.current) editInputRef.current.focus();
  }, [editId]);

  const handleSelectBoard = (id: string) => {
    setActiveBoard(id);
    setOpen(false);
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) { setCreating(false); return; }
    const board = await createBoard({ name, color: newColor });
    setNewName('');
    setCreating(false);
    setActiveBoard(board.id);
  };

  const handleStartEdit = (board: Board, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditId(board.id);
    setEditName(board.name);
    setDeleteConfirm(null);
  };

  const handleSaveEdit = async (id: string) => {
    const name = editName.trim();
    if (name) await updateBoard(id, { name });
    setEditId(null);
  };

  const handleDelete = async (id: string) => {
    if (boards.length <= 1) return; // can't delete last board
    await deleteBoard(id);
    setDeleteConfirm(null);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[12px] text-t-60 hover:text-t-85 bg-t-04 hover:bg-t-08 border border-t-06 hover:border-t-10 transition-all duration-150 group"
        title="Сменить доску"
      >
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: activeBoard?.color ?? '#3B82F6' }}
        />
        <span className="max-w-[100px] truncate">{activeBoard?.name ?? 'Доска'}</span>
        <ChevronDown size={10} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-[220px] glass-heavy rounded-xl border border-t-08 shadow-2xl overflow-hidden animate-fade-in-scale">
          <div className="px-3 py-2 border-b border-t-06">
            <span className="text-[10px] text-t-30 uppercase tracking-wider font-medium">Доски</span>
          </div>

          <div className="max-h-[240px] overflow-y-auto py-1">
            {boards.map((board) => (
              <div
                key={board.id}
                className={`flex items-center gap-2 px-3 py-2 group/item cursor-pointer transition-colors ${
                  board.id === activeBoardId ? 'bg-t-08' : 'hover:bg-t-04'
                }`}
                onClick={() => editId !== board.id && handleSelectBoard(board.id)}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: board.color }}
                />

                {editId === board.id ? (
                  <input
                    ref={editInputRef}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(board.id);
                      if (e.key === 'Escape') setEditId(null);
                    }}
                    onBlur={() => handleSaveEdit(board.id)}
                    className="flex-1 bg-t-06 border border-accent-blue/40 rounded px-1.5 py-0.5 text-[12px] text-t-85 outline-none min-w-0"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="flex-1 text-[12px] text-t-80 truncate min-w-0">{board.name}</span>
                )}

                {board.id === activeBoardId && editId !== board.id && (
                  <Check size={11} className="text-accent-blue flex-shrink-0" />
                )}

                {editId !== board.id && deleteConfirm !== board.id && (
                  <div className="flex gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity ml-auto">
                    <button
                      onClick={(e) => handleStartEdit(board, e)}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-t-08 text-t-30 hover:text-t-60"
                    >
                      <Pencil size={10} />
                    </button>
                    {boards.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(board.id); }}
                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/20 text-t-30 hover:text-red-400"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                )}

                {deleteConfirm === board.id && (
                  <div className="flex gap-1 ml-auto" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleDelete(board.id)}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/80 hover:bg-red-500 text-white"
                    >
                      Удалить
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-1.5 py-0.5 rounded text-[10px] text-t-40 hover:text-t-60"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {creating ? (
            <div className="px-3 py-2 border-t border-t-06 flex flex-col gap-2">
              <input
                ref={newInputRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') { setCreating(false); setNewName(''); }
                }}
                placeholder="Название доски"
                className="w-full bg-t-04 border border-t-06 focus:border-accent-blue/40 rounded-lg px-2.5 py-1.5 text-[12px] text-t-85 placeholder-t-25 outline-none"
              />
              <div className="flex gap-1 flex-wrap">
                {BOARD_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`w-5 h-5 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-1 ring-white/30' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={handleCreate}
                  className="flex-1 py-1 rounded-lg text-[11px] text-white bg-accent-blue/80 hover:bg-accent-blue transition-colors"
                >
                  Создать
                </button>
                <button
                  onClick={() => { setCreating(false); setNewName(''); }}
                  className="px-2 py-1 rounded-lg text-[11px] text-t-40 hover:text-t-60"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 w-full px-3 py-2 border-t border-t-06 text-[11px] text-t-35 hover:text-t-60 hover:bg-t-04 transition-colors"
            >
              <Plus size={11} />
              Новая доска
            </button>
          )}
        </div>
      )}
    </div>
  );
}
