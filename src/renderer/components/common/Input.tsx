import React from 'react';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  error?: string;
  autoFocus?: boolean;
  className?: string;
}

export default function Input({
  label,
  placeholder,
  value,
  onChange,
  multiline = false,
  rows = 4,
  error,
  autoFocus,
  className = '',
}: InputProps) {
  const baseClass = `
    w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-white/90 placeholder-white/25
    transition-colors outline-none
    ${error
      ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
      : 'border-white/10 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20'
    }
    ${className}
  `;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-white/50 uppercase tracking-wide">
          {label}
        </label>
      )}
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          autoFocus={autoFocus}
          className={`${baseClass} resize-none`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={baseClass}
        />
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
