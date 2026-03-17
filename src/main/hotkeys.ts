import { globalShortcut, BrowserWindow, clipboard } from 'electron';
import { HOTKEYS } from '../shared/constants';
import * as queries from './db/queries';

export interface HotkeyConfig {
  GRAB_TEXT: string;
  GRAB_FILES: string;
  QUICK_NOTE: string;
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
      };
    }
  } catch {
    // ignore parse errors
  }
  return {
    GRAB_TEXT: HOTKEYS.GRAB_TEXT,
    GRAB_FILES: HOTKEYS.GRAB_FILES,
    QUICK_NOTE: HOTKEYS.QUICK_NOTE,
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
  // Grab text
  globalShortcut.register(config.GRAB_TEXT, async () => {
    const originalClipboard = clipboard.readText();

    await new Promise((resolve) => setTimeout(resolve, 100));

    const capturedText = clipboard.readText();

    if (originalClipboard !== capturedText) {
      clipboard.writeText(originalClipboard);
    }

    if (capturedText) {
      showWindow(mainWindow);
      mainWindow.webContents.send('grab:text', capturedText);
    } else {
      showWindow(mainWindow);
      mainWindow.webContents.send('dialog:showCreate');
    }
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
