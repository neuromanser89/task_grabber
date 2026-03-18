import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron';
import path from 'path';
import { HOTKEYS } from '../shared/constants';

let focusWindow: BrowserWindow | null = null;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

export function createFocusWindow(taskId?: string) {
  if (focusWindow && !focusWindow.isDestroyed()) {
    focusWindow.focus();
    if (taskId) focusWindow.webContents.send('focus:setTask', taskId);
    return;
  }

  focusWindow = new BrowserWindow({
    width: 360,
    height: 520,
    minWidth: 300,
    minHeight: 400,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    focusWindow.loadURL('http://localhost:6173/focus.html');
  } else {
    focusWindow.loadFile(path.join(__dirname, '../../renderer/focus.html'));
  }

  focusWindow.once('ready-to-show', () => {
    focusWindow?.show();
    if (taskId) focusWindow?.webContents.send('focus:setTask', taskId);
  });

  focusWindow.on('closed', () => {
    focusWindow = null;
  });
}

export function toggleFocusWindow() {
  if (!focusWindow || focusWindow.isDestroyed()) {
    createFocusWindow();
    return;
  }
  if (focusWindow.isVisible()) {
    focusWindow.hide();
  } else {
    focusWindow.show();
    focusWindow.focus();
  }
}

export function getFocusWindow(): BrowserWindow | null {
  return focusWindow;
}

export function setupFocusHotkey() {
  globalShortcut.register(HOTKEYS.FOCUS, toggleFocusWindow);
}

export function setupFocusIpc(_getMainWindow: () => BrowserWindow | null) {
  ipcMain.on('focus:openTask', (_event, taskId: string) => {
    createFocusWindow(taskId);
  });

  ipcMain.on('focus:close', () => {
    if (focusWindow && !focusWindow.isDestroyed()) {
      focusWindow.close();
    }
  });

  ipcMain.on('focus:set-mini', (_event, isMini: boolean) => {
    if (!focusWindow || focusWindow.isDestroyed()) return;
    if (isMini) {
      focusWindow.setMinimumSize(280, 50);
      focusWindow.setSize(350, 50, true);
      focusWindow.setResizable(false);
    } else {
      focusWindow.setMinimumSize(300, 400);
      focusWindow.setSize(360, 520, true);
      focusWindow.setResizable(true);
    }
  });
}
