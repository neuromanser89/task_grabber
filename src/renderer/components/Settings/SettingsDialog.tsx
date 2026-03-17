import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Monitor, Sun, Moon, Keyboard, Power, X, Check, RotateCcw } from 'lucide-react';
import Modal from '../common/Modal';

type Theme = 'dark' | 'light' | 'system';

interface HotkeyConfig {
  GRAB_TEXT: string;
  GRAB_FILES: string;
  QUICK_NOTE: string;
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
  const [activeTab, setActiveTab] = useState<'general' | 'hotkeys' | 'appearance'>('general');
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [hotkeys, setHotkeys] = useState<HotkeyConfig>(DEFAULT_HOTKEYS);
  const [recordingKey, setRecordingKey] = useState<keyof HotkeyConfig | null>(null);
  const [saving, setSaving] = useState(false);

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
  }, [isOpen]);

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

  const HOTKEY_LABELS: Record<keyof HotkeyConfig, string> = {
    GRAB_TEXT: 'Захватить текст',
    GRAB_FILES: 'Захватить файлы',
    QUICK_NOTE: 'Быстрая заметка',
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
          { id: 'appearance', label: 'Оформление', icon: <Sun size={13} /> },
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
    </Modal>
  );
}
