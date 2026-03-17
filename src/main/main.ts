import { app, BrowserWindow, ipcMain, Notification } from 'electron';
import path from 'path';
import { setupTray } from './tray';
import { setupHotkeys, reloadHotkeys } from './hotkeys';
import { setupIpcHandlers } from './ipc-handlers';
import * as queries from './db/queries';

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    transparent: false,
    backgroundColor: '#0F0F0F',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../../../assets/icons/icon.ico'),
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:6173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startReminderPoller() {
  setInterval(() => {
    try {
      const due = queries.getDueReminders();
      for (const task of due) {
        queries.clearReminder(task.id);
        const notif = new Notification({
          title: 'Task Grabber — Напоминание',
          body: task.title,
          silent: false,
        });
        notif.on('click', () => {
          mainWindow?.show();
          mainWindow?.webContents.send('reminder:show', task.id);
        });
        notif.show();
      }
    } catch {
      // DB might not be ready yet — silently skip
    }
  }, 30_000); // check every 30 seconds
}

app.whenReady().then(() => {
  createWindow();
  setupTray(mainWindow!);
  setupHotkeys(mainWindow!);
  setupIpcHandlers();
  startReminderPoller();

  // Reload hotkeys when settings change
  ipcMain.on('hotkeys:reload', () => {
    if (mainWindow) reloadHotkeys(mainWindow);
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  // Keep app running in tray
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC for window controls
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window:close', () => mainWindow?.hide());
