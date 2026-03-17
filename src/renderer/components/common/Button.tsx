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
    'bg-gradient-to-r from-accent-blue to-accent-purple hover:from-blue-400 hover:to-purple-400 text-white shadow-lg hover:shadow-glow-blue active:shadow-none',
  secondary:
    'bg-white/[0.06] hover:bg-white/[0.1] text-white/70 hover:text-white/90 border border-white/[0.08] hover:border-white/[0.12]',
  ghost: 'bg-transparent hover:bg-white/[0.05] text-white/50 hover:text-white/70',
  danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400/80 hover:text-red-400 border border-red-500/15 hover:border-red-500/25',
};

const SIZE_CLASSES = {
  sm: 'px-3 py-1.5 text-[11px] gap-1.5',
  md: 'px-4 py-2 text-[13px] gap-2',
  lg: 'px-5 py-2.5 text-sm gap-2',
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
        inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200
        active:scale-[0.97] active:transition-none
        disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100
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
