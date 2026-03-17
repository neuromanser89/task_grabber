import { globalShortcut, BrowserWindow, clipboard } from 'electron';
import { HOTKEYS } from '../shared/constants';

export function setupHotkeys(mainWindow: BrowserWindow) {
  // Ctrl+Shift+T — grab selected text
  globalShortcut.register(HOTKEYS.GRAB_TEXT, async () => {
    const originalClipboard = clipboard.readText();

    // Simulate Ctrl+C to copy selected text
    // Small delay for clipboard to update
    await new Promise((resolve) => setTimeout(resolve, 100));

    const capturedText = clipboard.readText();

    // Restore original clipboard
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

  // Ctrl+Shift+F — grab files
  globalShortcut.register(HOTKEYS.GRAB_FILES, () => {
    showWindow(mainWindow);
    mainWindow.webContents.send('dialog:showCreate');
  });

  // Ctrl+Shift+N — quick note
  globalShortcut.register(HOTKEYS.QUICK_NOTE, () => {
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
