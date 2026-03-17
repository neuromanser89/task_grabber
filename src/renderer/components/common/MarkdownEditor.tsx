import React, { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  rows?: number;
  defaultMode?: 'edit' | 'preview';
}

function toggleCheckbox(text: string, index: number): string {
  let count = -1;
  return text.replace(/- \[([ x])\]/g, (match, state) => {
    count++;
    if (count === index) {
      return state === ' ' ? '- [x]' : '- [ ]';
    }
    return match;
  });
}

export default function MarkdownEditor({
  value,
  onChange,
  onBlur,
  placeholder = 'Описание (поддерживает Markdown)...',
  rows = 6,
  defaultMode = 'edit',
}: Props) {
  const [mode, setMode] = useState<'edit' | 'preview'>(
    defaultMode === 'preview' && value ? 'preview' : defaultMode
  );

  // Counter ref to track checkbox index during a single render pass
  const cbCounterRef = useRef(0);

  // Reset counter at start of every render so it's consistent
  cbCounterRef.current = 0;

  const hasContent = value.trim().length > 0;

  return (
    <div className="flex flex-col gap-1.5">
      {/* Mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-white/[0.04] rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setMode('edit')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all duration-150 ${
              mode === 'edit'
                ? 'bg-white/[0.10] text-white/80'
                : 'text-white/30 hover:text-white/50'
            }`}
          >
            Редактор
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all duration-150 ${
              mode === 'preview'
                ? 'bg-white/[0.10] text-white/80'
                : 'text-white/30 hover:text-white/50'
            }`}
          >
            Просмотр
          </button>
        </div>
        {mode === 'edit' && (
          <span className="text-[10px] text-white/20">Markdown</span>
        )}
      </div>

      {/* Content area */}
      {mode === 'edit' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          rows={rows}
          placeholder={placeholder}
          className="w-full bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.08] focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/15 rounded-lg px-3 py-2.5 text-[13px] text-white/75 placeholder-white/15 outline-none resize-none transition-all duration-200 font-mono"
        />
      ) : (
        <div
          className="markdown-body rounded-lg px-3 py-2.5 border border-white/[0.06] bg-white/[0.02] cursor-text"
          style={{ minHeight: `${rows * 24}px` }}
          onClick={() => setMode('edit')}
          title="Нажмите для редактирования"
        >
          {hasContent ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Intercept list items to make checkboxes clickable
                input({ type, checked }) {
                  if (type === 'checkbox') {
                    const idx = cbCounterRef.current++;
                    return (
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onChange(toggleCheckbox(value, idx))}
                        className="mr-1.5 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ accentColor: '#3B82F6' }}
                      />
                    );
                  }
                  return <input type={type} defaultChecked={checked} />;
                },
              }}
            >
              {value}
            </ReactMarkdown>
          ) : (
            <span className="text-[13px] text-white/15 italic">{placeholder}</span>
          )}
        </div>
      )}
    </div>
  );
}
