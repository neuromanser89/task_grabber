import { Tray, Menu, BrowserWindow, app, nativeImage } from 'electron';
import path from 'path';

let tray: Tray | null = null;

export function setupTray(mainWindow: BrowserWindow) {
  const iconPath = path.join(__dirname, '../../assets/icons/tray-icon.png');

  try {
    tray = new Tray(iconPath);
  } catch {
    // Fallback to empty icon if not found
    const emptyIcon = nativeImage.createEmpty();
    tray = new Tray(emptyIcon);
  }

  tray.setToolTip('Task Grabber');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Новая задача\tCtrl+Shift+T',
      click: () => {
        showWindow(mainWindow);
        mainWindow.webContents.send('dialog:showCreate');
      },
    },
    {
      label: 'Задача из файлов\tCtrl+Shift+F',
      click: () => {
        showWindow(mainWindow);
        mainWindow.webContents.send('dialog:showCreate');
      },
    },
    { type: 'separator' },
    {
      label: 'Открыть доску',
      click: () => showWindow(mainWindow),
    },
    { type: 'separator' },
    {
      label: 'Выход',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      showWindow(mainWindow);
    }
  });
}

function showWindow(mainWindow: BrowserWindow) {
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }
  mainWindow.focus();
}
