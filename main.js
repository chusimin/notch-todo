const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

const COLLAPSED_WIDTH = 200;
const COLLAPSED_HEIGHT = 32;
const EXPANDED_WIDTH = 560;
const EXPANDED_HEIGHT = 420;

let mainWindow = null;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function getCenteredX(width) {
  const display = screen.getPrimaryDisplay();
  const screenWidth = display.bounds.width;
  return Math.round((screenWidth - width) / 2);
}

function createWindow() {
  const x = getCenteredX(COLLAPSED_WIDTH);

  mainWindow = new BrowserWindow({
    width: COLLAPSED_WIDTH,
    height: COLLAPSED_HEIGHT,
    x,
    y: 0,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    fullscreenable: false,
    minimizable: false,
    maximizable: false,
    roundedCorners: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.setBounds(
      {
        x: getCenteredX(COLLAPSED_WIDTH),
        y: 0,
        width: COLLAPSED_WIDTH,
        height: COLLAPSED_HEIGHT,
      },
      false
    );
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.handle('window:set-mode', (event, mode) => {
  if (!mainWindow) return;

  let width;
  let height;

  if (mode === 'expanded') {
    width = EXPANDED_WIDTH;
    height = EXPANDED_HEIGHT;
  } else {
    width = COLLAPSED_WIDTH;
    height = COLLAPSED_HEIGHT;
  }

  const x = getCenteredX(width);
  mainWindow.setBounds({ x, y: 0, width, height }, false);
});

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide();
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
