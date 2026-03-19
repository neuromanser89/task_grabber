import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron';
import path from 'path';
import { HOTKEYS } from '../shared/constants';
import { setupExternalLinks } from './main';

let widgetWindow: BrowserWindow | null = null;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

export function createWidgetWindow() {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.focus();
    return;
  }

  widgetWindow = new BrowserWindow({
    width: 300,
    height: 400,
    minWidth: 240,
    minHeight: 200,
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

  setupExternalLinks(widgetWindow);

  if (isDev) {
    widgetWindow.loadURL('http://localhost:6173/widget.html');
  } else {
    widgetWindow.loadFile(path.join(__dirname, '../../renderer/widget.html'));
  }

  widgetWindow.once('ready-to-show', () => {
    widgetWindow?.show();
  });

  widgetWindow.on('closed', () => {
    widgetWindow = null;
  });
}

export function toggleWidgetWindow() {
  if (!widgetWindow || widgetWindow.isDestroyed()) {
    createWidgetWindow();
    return;
  }
  if (widgetWindow.isVisible()) {
    widgetWindow.hide();
  } else {
    widgetWindow.show();
    widgetWindow.focus();
  }
}

export function getWidgetWindow(): BrowserWindow | null {
  return widgetWindow;
}

export function setupWidgetHotkey() {
  globalShortcut.register(HOTKEYS.WIDGET, toggleWidgetWindow);
}

// IPC: open main window and show task detail
export function setupWidgetIpc(getMainWindow: () => BrowserWindow | null) {
  ipcMain.on('widget:openTask', (_event, taskId: string) => {
    const main = getMainWindow();
    if (!main) return;
    if (!main.isVisible()) main.show();
    main.focus();
    main.webContents.send('widget:openTask', taskId);
  });

  ipcMain.on('widget:toggle', () => {
    toggleWidgetWindow();
  });
}
