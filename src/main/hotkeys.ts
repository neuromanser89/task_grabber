import { globalShortcut, BrowserWindow, clipboard } from 'electron';
import { HOTKEYS } from '../shared/constants';
import * as queries from './db/queries';

export interface HotkeyConfig {
  GRAB_TEXT: string;
  GRAB_FILES: string;
  QUICK_NOTE: string;
  SCREENSHOT: string;
}

function loadHotkeyConfig(): HotkeyConfig {
  try {
    const raw = queries.getSetting('hotkeys');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        GRAB_TEXT: parsed.GRAB_TEXT || HOTKEYS.GRAB_TEXT,
        GRAB_FILES: parsed.GRAB_FILES || HOTKEYS.GRAB_FILES,
        QUICK_NOTE: parsed.QUICK_NOTE || HOTKEYS.QUICK_NOTE,
        SCREENSHOT: parsed.SCREENSHOT || HOTKEYS.SCREENSHOT,
      };
    }
  } catch {
    // ignore parse errors
  }
  return {
    GRAB_TEXT: HOTKEYS.GRAB_TEXT,
    GRAB_FILES: HOTKEYS.GRAB_FILES,
    QUICK_NOTE: HOTKEYS.QUICK_NOTE,
    SCREENSHOT: HOTKEYS.SCREENSHOT,
  };
}

export function setupHotkeys(mainWindow: BrowserWindow) {
  const config = loadHotkeyConfig();
  registerHotkeys(mainWindow, config);
}

export function reloadHotkeys(mainWindow: BrowserWindow) {
  globalShortcut.unregisterAll();
  const config = loadHotkeyConfig();
  registerHotkeys(mainWindow, config);
}

function registerHotkeys(mainWindow: BrowserWindow, config: HotkeyConfig) {
  // Grab text — instant mode vs dialog mode based on hold duration
  // We use keydown timestamp to detect quick press vs long press
  let pressStart: number | null = null;

  globalShortcut.register(config.GRAB_TEXT, () => {
    const now = Date.now();
    const elapsed = pressStart !== null ? now - pressStart : null;
    pressStart = now;

    const clipText = clipboard.readText();

    if (elapsed !== null && elapsed < 500) {
      // Quick press (<500ms) — instant create via renderer
      showWindow(mainWindow);
      mainWindow.webContents.send('grab:instant', clipText || '');
    } else {
      // Long press or first press — open dialog
      showWindow(mainWindow);
      if (clipText) {
        mainWindow.webContents.send('grab:text', clipText);
      } else {
        mainWindow.webContents.send('dialog:showCreate');
      }
    }
    // Reset after short delay so next press counts fresh
    setTimeout(() => { pressStart = null; }, 600);
  });

  // Grab files
  globalShortcut.register(config.GRAB_FILES, () => {
    showWindow(mainWindow);
    mainWindow.webContents.send('dialog:showCreate');
  });

  // Quick note
  globalShortcut.register(config.QUICK_NOTE, () => {
    showWindow(mainWindow);
    mainWindow.webContents.send('dialog:showQuickNote');
  });

  // Screenshot capture
  if (config.SCREENSHOT) {
    globalShortcut.register(config.SCREENSHOT, () => {
      showWindow(mainWindow);
      mainWindow.webContents.send('screenshot:capture');
    });
  }
}

export function unregisterHotkeys() {
  globalShortcut.unregisterAll();
}

function showWindow(mainWindow: BrowserWindow) {
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }
  mainWindow.focus();
}
