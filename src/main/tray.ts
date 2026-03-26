import { Tray, Menu, BrowserWindow, app, nativeImage } from 'electron';
import path from 'path';

let tray: Tray | null = null;

export function setupTray(mainWindow: BrowserWindow) {
  const iconDir = path.join(__dirname, '../../assets/icons');
  let icon: Electron.NativeImage;
  try {
    // nativeImage автоматически подхватывает @2x для HiDPI
    icon = nativeImage.createFromPath(path.join(iconDir, 'tray-icon.png'));
    // На Windows трей-иконка должна быть 16x16
    if (icon.isEmpty()) throw new Error('empty');
  } catch {
    icon = nativeImage.createEmpty();
  }
  tray = new Tray(icon);

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
