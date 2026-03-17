import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const VARIANT_CLASSES = {
  primary:
    'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 text-white shadow-lg hover:shadow-blue-500/25',
  secondary:
    'bg-white/10 hover:bg-white/15 text-white/80 hover:text-white border border-white/10',
  ghost: 'bg-transparent hover:bg-white/5 text-white/60 hover:text-white/80',
  danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 border border-red-500/20',
};

const SIZE_CLASSES = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
};

export default function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center rounded-lg font-medium transition-all
        disabled:opacity-40 disabled:cursor-not-allowed
        ${VARIANT_CLASSES[variant]}
        ${SIZE_CLASSES[size]}
        ${className}
      `}
    >
      {loading ? <Loader2 size={14} className="animate-spin flex-shrink-0" /> : icon}
      {children}
    </button>
  );
}
