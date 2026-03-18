import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Monitor, Sun, Moon, Keyboard, Power, Check, RotateCcw, Download, Upload, Database, Clock, AlertTriangle, Bot } from 'lucide-react';
import Modal from '../common/Modal';

type Theme = 'dark' | 'light' | 'system';

interface HotkeyConfig {
  GRAB_TEXT: string;
  GRAB_FILES: string;
  QUICK_NOTE: string;
  SCREENSHOT: string;
}

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onThemeChange: (theme: Theme) => void;
  currentTheme: Theme;
}

const DEFAULT_HOTKEYS: HotkeyConfig = {
  GRAB_TEXT: 'CommandOrControl+Shift+T',
  GRAB_FILES: 'CommandOrControl+Shift+F',
  QUICK_NOTE: 'CommandOrControl+Shift+N',
  SCREENSHOT: 'CommandOrControl+Shift+S',
};

function formatHotkey(raw: string): string {
  return raw
    .replace('CommandOrControl', 'Ctrl')
    .replace('Control', 'Ctrl')
    .replace('Command', 'Cmd')
    .replace('Alt', 'Alt')
    .replace('Shift', 'Shift')
    .split('+')
    .join(' + ');
}

function keyEventToAccelerator(e: KeyboardEvent): string | null {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('CommandOrControl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');

  const key = e.key;
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) return null;

  const keyMap: Record<string, string> = {
    ' ': 'Space',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
  };
  parts.push(keyMap[key] || (key.length === 1 ? key.toUpperCase() : key));
  return parts.join('+');
}

export default function SettingsDialog({
  isOpen,
  onClose,
  onThemeChange,
  currentTheme,
}: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'hotkeys' | 'appearance' | 'data' | 'ai' | 'automation'>('general');
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [hotkeys, setHotkeys] = useState<HotkeyConfig>(DEFAULT_HOTKEYS);
  const [recordingKey, setRecordingKey] = useState<keyof HotkeyConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [backups, setBackups] = useState<{ name: string; path: string; date: string; size: number }[]>([]);
  const [dataStatus, setDataStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  // Automation settings
  const [autoArchive, setAutoArchive] = useState(true);
  const [autoArchiveDays, setAutoArchiveDays] = useState('7');
  const [overdueReminders, setOverdueReminders] = useState(true);
  const [staleHighPriority, setStaleHighPriority] = useState(true);

  // AI settings
  const [aiProvider, setAiProvider] = useState<'openrouter' | 'ollama'>('openrouter');
  const [aiModel, setAiModel] = useState('openai/gpt-4o-mini');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiBaseUrl, setAiBaseUrl] = useState('http://localhost:11434');
  const [aiExcludeConf, setAiExcludeConf] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    // Load settings
    window.electronAPI?.getAutoLaunch().then((v: boolean) => setAutoLaunch(v));
    window.electronAPI?.getSetting('hotkeys').then((raw: string | null) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setHotkeys({ ...DEFAULT_HOTKEYS, ...parsed });
        } catch { /* ignore */ }
      }
    });
    // Load backups
    window.electronAPI?.listBackups().then((list) => setBackups(list ?? []));
    // Load automation settings
    Promise.all([
      window.electronAPI?.getSetting('automation_autoArchive'),
      window.electronAPI?.getSetting('automation_autoArchiveDays'),
      window.electronAPI?.getSetting('automation_overdueReminders'),
      window.electronAPI?.getSetting('automation_staleHighPriority'),
    ]).then(([arch, days, overdue, stale]) => {
      setAutoArchive(arch !== 'false');
      if (days) setAutoArchiveDays(days as string);
      setOverdueReminders(overdue !== 'false');
      setStaleHighPriority(stale !== 'false');
    });
    // Load AI settings
    Promise.all([
      window.electronAPI?.getSetting('ai_provider'),
      window.electronAPI?.getSetting('ai_model'),
      window.electronAPI?.getSetting('ai_api_key'),
      window.electronAPI?.getSetting('ai_base_url'),
      window.electronAPI?.getSetting('ai_exclude_confidential'),
    ]).then(([prov, model, key, url, excl]) => {
      if (prov) setAiProvider(prov as 'openrouter' | 'ollama');
      if (model) setAiModel(model as string);
      if (key) setAiApiKey(key as string);
      if (url) setAiBaseUrl(url as string);
      setAiExcludeConf(excl === 'true');
    });
  }, [isOpen]);

  const handleExport = async () => {
    setDataLoading(true);
    setDataStatus(null);
    const result = await window.electronAPI?.exportData();
    setDataLoading(false);
    if (result?.success) {
      setDataStatus({ type: 'success', msg: 'Экспорт выполнен' });
    } else {
      setDataStatus({ type: 'error', msg: 'Отменено' });
    }
  };

  const handleImport = async () => {
    setDataLoading(true);
    setDataStatus(null);
    const result = await window.electronAPI?.importData();
    setDataLoading(false);
    if (result?.success) {
      setDataStatus({ type: 'success', msg: 'Импорт выполнен. Перезапустите приложение.' });
    } else if (result?.error) {
      setDataStatus({ type: 'error', msg: result.error });
    } else {
      setDataStatus({ type: 'error', msg: 'Отменено' });
    }
  };

  const handleCreateBackup = async () => {
    setDataLoading(true);
    setDataStatus(null);
    const result = await window.electronAPI?.createBackup();
    if (result?.success) {
      const list = await window.electronAPI?.listBackups();
      setBackups(list ?? []);
      setDataStatus({ type: 'success', msg: 'Бэкап создан' });
    }
    setDataLoading(false);
  };

  const handleRestoreBackup = async (backupPath: string) => {
    if (!window.confirm('Текущие данные будут заменены. Продолжить?')) return;
    setDataLoading(true);
    setDataStatus(null);
    const result = await window.electronAPI?.restoreBackup(backupPath);
    setDataLoading(false);
    if (result?.success) {
      setDataStatus({ type: 'success', msg: 'Восстановлено. Перезапустите приложение.' });
    } else {
      setDataStatus({ type: 'error', msg: 'Ошибка восстановления' });
    }
  };

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function formatDate(isoDate: string): string {
    try {
      return new Date(isoDate).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return isoDate;
    }
  }

  const handleAutoLaunchToggle = async () => {
    const next = !autoLaunch;
    setAutoLaunch(next);
    await window.electronAPI?.setAutoLaunch(next);
  };

  const handleStartRecording = (key: keyof HotkeyConfig) => {
    setRecordingKey(key);
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!recordingKey) return;
    e.preventDefault();
    e.stopPropagation();

    const acc = keyEventToAccelerator(e);
    if (!acc) return;

    setHotkeys((prev) => ({ ...prev, [recordingKey]: acc }));
    setRecordingKey(null);
  }, [recordingKey]);

  useEffect(() => {
    if (recordingKey) {
      window.addEventListener('keydown', handleKeyDown, true);
    }
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [recordingKey, handleKeyDown]);

  const handleSaveHotkeys = async () => {
    setSaving(true);
    await window.electronAPI?.setSetting('hotkeys', JSON.stringify(hotkeys));
    window.electronAPI?.reloadHotkeys();
    setSaving(false);
  };

  const handleResetHotkeys = () => {
    setHotkeys(DEFAULT_HOTKEYS);
  };

  const handleSaveAi = async () => {
    setAiSaving(true);
    await Promise.all([
      window.electronAPI?.setSetting('ai_provider', aiProvider),
      window.electronAPI?.setSetting('ai_model', aiModel),
      window.electronAPI?.setSetting('ai_api_key', aiApiKey),
      window.electronAPI?.setSetting('ai_base_url', aiBaseUrl),
      window.electronAPI?.setSetting('ai_exclude_confidential', aiExcludeConf ? 'true' : 'false'),
    ]);
    setAiSaving(false);
  };

  const HOTKEY_LABELS: Record<keyof HotkeyConfig, string> = {
    GRAB_TEXT: 'Захватить текст',
    GRAB_FILES: 'Захватить файлы',
    QUICK_NOTE: 'Быстрая заметка',
    SCREENSHOT: 'Скриншот-задача',
  };

  const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'dark', label: 'Тёмная', icon: <Moon size={14} /> },
    { value: 'light', label: 'Светлая', icon: <Sun size={14} /> },
    { value: 'system', label: 'Системная', icon: <Monitor size={14} /> },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Настройки" size="md">
      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
        {([
          { id: 'general', label: 'Общие', icon: <Settings size={13} /> },
          { id: 'hotkeys', label: 'Хоткеи', icon: <Keyboard size={13} /> },
          { id: 'appearance', label: 'Вид', icon: <Sun size={13} /> },
          { id: 'data', label: 'Данные', icon: <Database size={13} /> },
          { id: 'ai', label: 'AI', icon: <Bot size={13} /> },
          { id: 'automation', label: 'Авто', icon: <Clock size={13} /> },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 flex-1 justify-center h-7 text-xs font-medium rounded-md transition-all duration-150 ${
              activeTab === tab.id
                ? 'bg-white/[0.1] text-white/90'
                : 'text-white/40 hover:text-white/60 hover:bg-white/[0.05]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* General tab */}
      {activeTab === 'general' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-blue/15 flex items-center justify-center">
                <Power size={14} className="text-accent-blue" />
              </div>
              <div>
                <div className="text-sm font-medium text-white/85">Автозапуск</div>
                <div className="text-xs text-white/40">Запускать при старте Windows</div>
              </div>
            </div>
            <button
              onClick={handleAutoLaunchToggle}
              className={`relative w-10 h-[22px] rounded-full transition-all duration-200 flex-shrink-0 ${
                autoLaunch ? 'bg-accent-blue shadow-[0_0_8px_rgba(59,130,246,0.3)]' : 'bg-white/[0.12]'
              }`}
            >
              <div
                className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
                  autoLaunch ? 'left-[21px]' : 'left-[3px]'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Hotkeys tab */}
      {activeTab === 'hotkeys' && (
        <div className="space-y-3">
          {(Object.keys(hotkeys) as (keyof HotkeyConfig)[]).map((key) => (
            <div
              key={key}
              className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]"
            >
              <span className="text-sm text-white/70">{HOTKEY_LABELS[key]}</span>
              <button
                onClick={() => handleStartRecording(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all duration-150 ${
                  recordingKey === key
                    ? 'bg-accent-blue/20 border border-accent-blue/50 text-accent-blue animate-pulse'
                    : 'bg-white/[0.07] border border-white/[0.1] text-white/70 hover:bg-white/[0.1] hover:text-white/90'
                }`}
              >
                {recordingKey === key ? 'Нажмите комбинацию...' : formatHotkey(hotkeys[key])}
              </button>
            </div>
          ))}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleResetHotkeys}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/50 hover:text-white/70 rounded-md hover:bg-white/[0.05] transition-all duration-150"
            >
              <RotateCcw size={12} />
              Сбросить
            </button>
            <button
              onClick={handleSaveHotkeys}
              disabled={saving}
              className="ml-auto flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-gradient-to-r from-accent-blue to-accent-purple text-white rounded-lg transition-all duration-200 hover:shadow-glow-blue active:scale-[0.97] disabled:opacity-60"
            >
              <Check size={12} />
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      )}

      {/* Appearance tab */}
      {activeTab === 'appearance' && (
        <div className="space-y-4">
          <div>
            <div className="text-xs font-medium text-white/40 mb-3 uppercase tracking-wider">Тема</div>
            <div className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onThemeChange(opt.value)}
                  className={`relative flex flex-col items-center gap-2 p-3 rounded-lg border transition-all duration-200 ${
                    currentTheme === opt.value
                      ? 'bg-accent-blue/10 border-accent-blue/40 text-white/90 shadow-[0_0_12px_rgba(59,130,246,0.1)]'
                      : 'bg-white/[0.03] border-white/[0.06] text-white/50 hover:border-white/[0.12] hover:text-white/70'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    opt.value === 'dark' ? 'bg-[#0F0F0F]' :
                    opt.value === 'light' ? 'bg-[#F8F9FA]' :
                    'bg-gradient-to-br from-[#0F0F0F] to-[#F8F9FA]'
                  } border border-white/10`}>
                    <span className={opt.value === 'light' ? 'text-gray-700' : 'text-white/70'}>
                      {opt.icon}
                    </span>
                  </div>
                  <span className="text-xs font-medium">{opt.label}</span>
                  {currentTheme === opt.value && (
                    <div className="absolute top-1.5 right-1.5">
                      <Check size={10} className="text-accent-blue" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Data tab */}
      {activeTab === 'data' && (
        <div className="space-y-4">
          {/* Status message */}
          {dataStatus && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
              dataStatus.type === 'success'
                ? 'bg-accent-green/10 border border-accent-green/20 text-accent-green'
                : 'bg-accent-red/10 border border-accent-red/20 text-accent-red'
            }`}>
              {dataStatus.type === 'success' ? <Check size={12} /> : <AlertTriangle size={12} />}
              {dataStatus.msg}
            </div>
          )}

          {/* Export / Import */}
          <div>
            <div className="text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">Экспорт / Импорт</div>
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                disabled={dataLoading}
                className="flex items-center gap-1.5 flex-1 justify-center h-8 px-3 text-xs font-medium bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-white/70 hover:text-white/90 rounded-lg transition-all duration-150 disabled:opacity-50"
              >
                <Download size={12} />
                Экспорт JSON
              </button>
              <button
                onClick={handleImport}
                disabled={dataLoading}
                className="flex items-center gap-1.5 flex-1 justify-center h-8 px-3 text-xs font-medium bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-white/70 hover:text-white/90 rounded-lg transition-all duration-150 disabled:opacity-50"
              >
                <Upload size={12} />
                Импорт JSON
              </button>
            </div>
          </div>

          {/* Backups */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-white/40 uppercase tracking-wider">Бэкапы (последние 5)</div>
              <button
                onClick={handleCreateBackup}
                disabled={dataLoading}
                className="flex items-center gap-1 text-xs text-accent-blue hover:text-accent-blue/80 transition-colors disabled:opacity-50"
              >
                <Database size={11} />
                Создать
              </button>
            </div>
            {backups.length === 0 ? (
              <div className="text-xs text-white/30 py-2 text-center">Бэкапов нет</div>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
                {backups.map((b) => (
                  <div
                    key={b.name}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock size={11} className="text-white/30 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs text-white/70 truncate">{formatDate(b.date)}</div>
                        <div className="text-[10px] text-white/30">{formatSize(b.size)}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestoreBackup(b.path)}
                      disabled={dataLoading}
                      className="flex-shrink-0 px-2 py-1 text-[10px] text-white/50 hover:text-white/80 bg-white/[0.05] hover:bg-white/[0.09] rounded-md transition-all duration-150 disabled:opacity-50"
                    >
                      Восстановить
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI tab */}
      {activeTab === 'ai' && (
        <div className="space-y-4">
          {/* Security notice */}
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-500/[0.07] border border-amber-500/[0.2]">
            <AlertTriangle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-amber-300/80">
              Данные задач отправляются на внешний сервер при каждом запросе.
              Конфиденциальные задачи обфусцируются автоматически.
            </span>
          </div>

          {/* Provider */}
          <div>
            <div className="text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">Провайдер</div>
            <div className="grid grid-cols-2 gap-2">
              {(['openrouter', 'ollama'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setAiProvider(p)}
                  className={`py-2 rounded-lg text-xs font-medium border transition-all duration-150 ${
                    aiProvider === p
                      ? 'bg-accent-blue/15 border-accent-blue/40 text-white/90'
                      : 'bg-white/[0.03] border-white/[0.06] text-white/50 hover:border-white/[0.12]'
                  }`}
                >
                  {p === 'openrouter' ? 'OpenRouter (облако)' : 'Ollama (локально)'}
                </button>
              ))}
            </div>
          </div>

          {/* Model */}
          <div>
            <div className="text-xs font-medium text-white/40 mb-1.5 uppercase tracking-wider">Модель</div>
            <input
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              placeholder={aiProvider === 'ollama' ? 'llama3.2' : 'openai/gpt-4o-mini'}
              className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-accent-blue/40 rounded-lg px-3 py-2 text-sm text-white/85 placeholder:text-white/25 outline-none transition-colors"
            />
          </div>

          {/* API Key (OpenRouter only) */}
          {aiProvider === 'openrouter' && (
            <div>
              <div className="text-xs font-medium text-white/40 mb-1.5 uppercase tracking-wider">API Ключ</div>
              <input
                value={aiApiKey}
                onChange={(e) => setAiApiKey(e.target.value)}
                type="password"
                placeholder="sk-or-..."
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-accent-blue/40 rounded-lg px-3 py-2 text-sm text-white/85 placeholder:text-white/25 outline-none transition-colors"
              />
            </div>
          )}

          {/* Base URL (Ollama only) */}
          {aiProvider === 'ollama' && (
            <div>
              <div className="text-xs font-medium text-white/40 mb-1.5 uppercase tracking-wider">Ollama URL</div>
              <input
                value={aiBaseUrl}
                onChange={(e) => setAiBaseUrl(e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-accent-blue/40 rounded-lg px-3 py-2 text-sm text-white/85 placeholder:text-white/25 outline-none transition-colors"
              />
            </div>
          )}

          {/* Exclude confidential */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <div>
              <div className="text-sm text-white/80">Полностью исключать конфиденциальные</div>
              <div className="text-xs text-white/40 mt-0.5">Задачи с пометкой "конфиденциально" не попадут в контекст</div>
            </div>
            <button
              onClick={() => setAiExcludeConf((v) => !v)}
              className={`relative w-10 h-[22px] rounded-full transition-all duration-200 flex-shrink-0 ml-3 ${
                aiExcludeConf ? 'bg-accent-blue shadow-[0_0_8px_rgba(59,130,246,0.3)]' : 'bg-white/[0.12]'
              }`}
            >
              <div
                className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
                  aiExcludeConf ? 'left-[21px]' : 'left-[3px]'
                }`}
              />
            </button>
          </div>

          <button
            onClick={handleSaveAi}
            disabled={aiSaving}
            className="w-full flex items-center justify-center gap-1.5 h-9 text-xs font-medium bg-gradient-to-r from-accent-blue to-accent-purple text-white rounded-lg transition-all duration-200 hover:opacity-90 disabled:opacity-60"
          >
            <Check size={12} />
            {aiSaving ? 'Сохранение...' : 'Сохранить настройки AI'}
          </button>
        </div>
      )}

      {/* Automation tab */}
      {activeTab === 'automation' && (
        <div className="space-y-4">
          {/* Auto-archive */}
          <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white/85">Автоархивация готовых задач</div>
                <div className="text-xs text-white/40">Задачи в "Готово"/"Забито" старше N дней</div>
              </div>
              <button
                onClick={() => {
                  const next = !autoArchive;
                  setAutoArchive(next);
                  window.electronAPI?.setSetting('automation_autoArchive', String(next));
                }}
                className={`relative w-10 h-[22px] rounded-full transition-all duration-200 flex-shrink-0 ${
                  autoArchive ? 'bg-accent-blue shadow-[0_0_8px_rgba(59,130,246,0.3)]' : 'bg-white/[0.12]'
                }`}
              >
                <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${autoArchive ? 'left-[21px]' : 'left-[3px]'}`} />
              </button>
            </div>
            {autoArchive && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/50">Через</span>
                <input
                  type="number"
                  min="1"
                  value={autoArchiveDays}
                  onChange={(e) => {
                    setAutoArchiveDays(e.target.value);
                    window.electronAPI?.setSetting('automation_autoArchiveDays', e.target.value);
                  }}
                  className="w-16 bg-white/[0.04] border border-white/[0.08] focus:border-accent-blue/40 rounded-lg px-2.5 py-1 text-xs text-white/85 outline-none transition-colors"
                />
                <span className="text-xs text-white/50">дней</span>
              </div>
            )}
          </div>

          {/* Overdue reminders */}
          <div className="flex items-center justify-between p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <div>
              <div className="text-sm font-medium text-white/85">Напоминания о просроченных</div>
              <div className="text-xs text-white/40">Автоматически ставить reminder для overdue задач</div>
            </div>
            <button
              onClick={() => {
                const next = !overdueReminders;
                setOverdueReminders(next);
                window.electronAPI?.setSetting('automation_overdueReminders', String(next));
              }}
              className={`relative w-10 h-[22px] rounded-full transition-all duration-200 flex-shrink-0 ${
                overdueReminders ? 'bg-accent-blue shadow-[0_0_8px_rgba(59,130,246,0.3)]' : 'bg-white/[0.12]'
              }`}
            >
              <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${overdueReminders ? 'left-[21px]' : 'left-[3px]'}`} />
            </button>
          </div>

          {/* Stale high-priority */}
          <div className="flex items-center justify-between p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <div>
              <div className="text-sm font-medium text-white/85">Залежавшиеся важные задачи</div>
              <div className="text-xs text-white/40">Напоминать если высокий приоритет в "Новые" 3+ дней</div>
            </div>
            <button
              onClick={() => {
                const next = !staleHighPriority;
                setStaleHighPriority(next);
                window.electronAPI?.setSetting('automation_staleHighPriority', String(next));
              }}
              className={`relative w-10 h-[22px] rounded-full transition-all duration-200 flex-shrink-0 ${
                staleHighPriority ? 'bg-accent-blue shadow-[0_0_8px_rgba(59,130,246,0.3)]' : 'bg-white/[0.12]'
              }`}
            >
              <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${staleHighPriority ? 'left-[21px]' : 'left-[3px]'}`} />
            </button>
          </div>

          {/* Manual trigger */}
          <button
            onClick={() => window.electronAPI?.runAutomation()}
            className="w-full flex items-center justify-center gap-1.5 h-8 text-xs text-white/60 hover:text-white/90 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg transition-all duration-150"
          >
            <Clock size={12} />
            Запустить проверку сейчас
          </button>
        </div>
      )}
    </Modal>
  );
}
