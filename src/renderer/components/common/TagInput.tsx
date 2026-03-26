import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Tag } from '@shared/types';
import { X } from 'lucide-react';

const TAG_PALETTE = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308',
  '#84CC16', '#22C55E', '#10B981', '#14B8A6',
  '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
  '#A855F7', '#EC4899', '#F43F5E',
];

function randomColor(): string {
  return TAG_PALETTE[Math.floor(Math.random() * TAG_PALETTE.length)];
}

interface Props {
  initialTags: Tag[];
  onAdd: (tagId: string) => Promise<void>;
  onRemove: (tagId: string) => Promise<void>;
  onChange?: (tags: Tag[]) => void;
}

export default function TagInput({ initialTags, onAdd, onRemove, onChange }: Props) {
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [input, setInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTags(initialTags);
  }, [initialTags]);

  const loadAllTags = useCallback(async () => {
    const fetched = await window.electronAPI?.getTags() ?? [];
    setAllTags(fetched);
  }, []);

  useEffect(() => {
    loadAllTags();
  }, [loadAllTags]);

  const tagIds = new Set(tags.map((t) => t.id));

  const filtered = allTags.filter(
    (t) => !tagIds.has(t.id) && t.name.toLowerCase().includes(input.toLowerCase())
  );

  const canCreate = input.trim().length > 0 && !allTags.some(
    (t) => t.name.toLowerCase() === input.trim().toLowerCase()
  );

  async function addTag(tag: Tag) {
    await onAdd(tag.id);
    const next = [...tags, tag];
    setTags(next);
    onChange?.(next);
    setInput('');
    setShowDropdown(false);
    inputRef.current?.focus();
  }

  async function createAndAdd() {
    const name = input.trim();
    if (!name) return;
    const color = randomColor();
    const newTag = await window.electronAPI?.createTag(name, color);
    if (newTag) {
      setAllTags((prev) => [...prev, newTag]);
      await addTag(newTag);
      window.dispatchEvent(new CustomEvent('tags-changed'));
    }
  }

  async function removeTag(tagId: string) {
    await onRemove(tagId);
    const next = tags.filter((t) => t.id !== tagId);
    setTags(next);
    onChange?.(next);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const items = canCreate ? [...filtered, null] : filtered;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (showDropdown && items.length > 0) {
        const selected = items[highlightIndex];
        if (selected === null) {
          createAndAdd();
        } else {
          addTag(selected as Tag);
        }
      } else if (input.trim()) {
        createAndAdd();
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setInput('');
    } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1].id);
    }
  }

  function updateDropdownPos() {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 192) });
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value);
    setHighlightIndex(0);
    updateDropdownPos();
    setShowDropdown(true);
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const dropdownItems = canCreate ? [...filtered, null] : filtered;

  return (
    <div className="flex flex-col gap-2">
      {/* Existing tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
              style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color,
                border: `1px solid ${tag.color}40`,
              }}
            >
              {tag.name}
              <button
                onClick={() => removeTag(tag.id)}
                className="hover:opacity-100 opacity-60 transition-opacity ml-0.5"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          onFocus={() => { updateDropdownPos(); setShowDropdown(true); }}
          onKeyDown={handleKeyDown}
          placeholder="+ добавить тег"
          className="w-full bg-transparent text-[12px] text-t-60 placeholder-t-20 outline-none border-b border-t-06 focus:border-t-20 pb-1 transition-colors"
        />

        {/* Dropdown — portal с fixed позиционированием, чтобы вылезал поверх stacking context */}
        {showDropdown && dropdownItems.length > 0 && createPortal(
          <div
            ref={dropdownRef}
            className="fixed rounded-lg overflow-hidden border border-t-08 shadow-xl glass-heavy"
            style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
          >
            {dropdownItems.map((item, idx) =>
              item === null ? (
                <button
                  key="create"
                  onMouseDown={(e) => { e.preventDefault(); createAndAdd(); }}
                  className={`w-full text-left px-3 py-2 text-[12px] flex items-center gap-2 transition-colors ${
                    highlightIndex === idx ? 'bg-t-08' : 'hover:bg-t-05'
                  }`}
                >
                  <span className="text-t-35">+</span>
                  <span className="text-t-70">Создать</span>
                  <span className="text-t-50 font-medium">"{input.trim()}"</span>
                </button>
              ) : (
                <button
                  key={(item as Tag).id}
                  onMouseDown={(e) => { e.preventDefault(); addTag(item as Tag); }}
                  className={`w-full text-left px-3 py-2 text-[12px] flex items-center gap-2 transition-colors ${
                    highlightIndex === idx ? 'bg-t-08' : 'hover:bg-t-05'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: (item as Tag).color }}
                  />
                  <span className="text-t-75">{(item as Tag).name}</span>
                </button>
              )
            )}
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
