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
    w-full bg-white/[0.04] border rounded-lg px-3 py-2 text-[13px] text-white/85 placeholder-white/20
    transition-all duration-200 outline-none
    ${error
      ? 'border-red-500/40 focus:border-red-500/60 focus:ring-1 focus:ring-red-500/20 focus:bg-red-500/[0.02]'
      : 'border-white/[0.06] hover:border-white/[0.1] focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/15 focus:bg-white/[0.05]'
    }
    ${className}
  `;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
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
      {error && <p className="text-[11px] text-red-400/80">{error}</p>}
    </div>
  );
}
