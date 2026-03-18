export const DEFAULT_COLUMNS = [
  { name: 'Новые', color: '#3B82F6', icon: 'inbox', sort_order: 0, is_default: 1, column_type: 'backlog' as const },
  { name: 'В работе', color: '#F59E0B', icon: 'loader', sort_order: 1, is_default: 0, column_type: 'in_progress' as const },
  { name: 'Ждём', color: '#8B5CF6', icon: 'pause-circle', sort_order: 2, is_default: 0, column_type: 'waiting' as const },
  { name: 'Готово', color: '#10B981', icon: 'check-circle', sort_order: 3, is_default: 0, column_type: 'done' as const },
  { name: 'Забито', color: '#6B7280', icon: 'x-circle', sort_order: 4, is_default: 0, column_type: 'cancelled' as const },
] as const;

export const COLUMN_TYPE_LABELS: Record<string, string> = {
  backlog: 'Бэклог / Входящие',
  in_progress: 'В работе',
  waiting: 'Ожидание',
  done: 'Выполнено',
  cancelled: 'Отменено',
};

export const HOTKEYS = {
  GRAB_TEXT: 'CommandOrControl+Shift+T',
  GRAB_FILES: 'CommandOrControl+Shift+F',
  QUICK_NOTE: 'CommandOrControl+Shift+N',
  WIDGET: 'CommandOrControl+Shift+W',
  FOCUS: 'CommandOrControl+Shift+F2',
  SCREENSHOT: 'CommandOrControl+Shift+S',
} as const;

export const PRIORITY_LABELS: Record<number, string> = {
  0: 'Нет',
  1: 'Низкий',
  2: 'Средний',
  3: 'Высокий',
};

export const PRIORITY_COLORS: Record<number, string> = {
  0: 'transparent',
  1: '#3B82F6',
  2: '#F59E0B',
  3: '#EF4444',
};

export const SOURCE_ICONS: Record<string, string> = {
  manual: 'hand',
  text: 'file-text',
  file: 'folder',
  email: 'mail',
};
