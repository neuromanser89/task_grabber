import React, { useEffect, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  taskId?: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
  onTaskClick?: (taskId: string) => void;
}

function Toast({ toast, onDismiss, onTaskClick }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const t1 = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss
    const duration = toast.duration ?? 3000;
    const t2 = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, duration);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [toast.id, toast.duration, onDismiss]);

  const icon = toast.type === 'success'
    ? <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
    : toast.type === 'error'
    ? <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
    : <Info size={14} className="text-blue-400 flex-shrink-0" />;

  const borderColor = toast.type === 'success'
    ? 'border-emerald-500/20 border-l-emerald-500/60'
    : toast.type === 'error'
    ? 'border-red-500/20 border-l-red-500/60'
    : 'border-blue-500/20 border-l-blue-500/60';

  const glowShadow = toast.type === 'success'
    ? '0 4px 20px rgba(16,185,129,0.12)'
    : toast.type === 'error'
    ? '0 4px 20px rgba(239,68,68,0.12)'
    : '0 4px 20px rgba(59,130,246,0.12)';

  const handleClick = () => {
    if (toast.taskId && onTaskClick) {
      onTaskClick(toast.taskId);
      onDismiss(toast.id);
    }
  };

  return (
    <div
      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl glass-heavy border border-l-2 ${borderColor} max-w-xs min-w-[200px] transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      } ${toast.taskId ? 'cursor-pointer hover:brightness-110' : ''}`}
      style={{ boxShadow: visible ? glowShadow : 'none' }}
      onClick={handleClick}
    >
      {icon}
      <span className="text-[12px] text-t-85 flex-1 leading-tight">{toast.message}</span>
      <button
        onClick={(e) => { e.stopPropagation(); setVisible(false); setTimeout(() => onDismiss(toast.id), 300); }}
        className="text-t-25 hover:text-t-60 transition-colors flex-shrink-0"
      >
        <X size={12} />
      </button>
    </div>
  );
}

// ─── Toast Container ─────────────────────────────────────────────────────────

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  onTaskClick?: (taskId: string) => void;
}

export function ToastContainer({ toasts, onDismiss, onTaskClick }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-[99999] pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast toast={t} onDismiss={onDismiss} onTaskClick={onTaskClick} />
        </div>
      ))}
    </div>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info', taskId?: string, duration?: number) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type, taskId, duration }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, dismiss };
}
