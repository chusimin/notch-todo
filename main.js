const {
  app,
  BrowserWindow,
  screen,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
} = require('electron');
const path = require('path');

const COLLAPSED_WIDTH = 200;
const COLLAPSED_HEIGHT = 32;
const EXPANDED_WIDTH = 560;
const EXPANDED_HEIGHT = 420;

let mainWindow = null;
let tray = null;
let currentMode = 'collapsed';

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

function getCenteredX(width) {
  const display = screen.getPrimaryDisplay();
  const screenWidth = display.bounds.width;
  return Math.round((screenWidth - width) / 2);
}

function applyMode(mode, animate) {
  if (!mainWindow) return;
  const width = mode === 'expanded' ? EXPANDED_WIDTH : COLLAPSED_WIDTH;
  const height = mode === 'expanded' ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;
  const x = getCenteredX(width);
  mainWindow.setBounds({ x, y: 0, width, height }, animate);
  currentMode = mode;
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
    applyMode('collapsed', false);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function toggleVisibility() {
  if (!mainWindow) {
    createWindow();
    return;
  }
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
  }
  refreshTrayMenu();
}

function refreshTrayMenu() {
  if (!tray) return;
  const visible = !!(mainWindow && mainWindow.isVisible());
  const menu = Menu.buildFromTemplate([
    {
      label: visible ? '隐藏刘海' : '显示刘海',
      click: toggleVisibility,
    },
    {
      label: '重新居中',
      click: () => applyMode(currentMode, false),
    },
    { type: 'separator' },
    {
      label: '关于刘海待办',
      click: () => {
        const { dialog } = require('electron');
        dialog.showMessageBox({
          type: 'info',
          title: '关于',
          message: '刘海待办',
          detail:
            '一个常驻 macOS 屏幕顶部的优先级待办工具。\n点击刘海展开，再次点击收起。\n数据保存在本地 LocalStorage。',
          buttons: ['好'],
        });
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      accelerator: 'Cmd+Q',
      click: () => app.quit(),
    },
  ]);
  tray.setContextMenu(menu);
}

function createTray() {
  tray = new Tray(nativeImage.createEmpty());
  tray.setTitle('📝');
  tray.setToolTip('刘海待办');
  tray.on('click', () => {
    if (!mainWindow) return;
    if (!mainWindow.isVisible()) {
      mainWindow.show();
      refreshTrayMenu();
    }
  });
  refreshTrayMenu();
}

ipcMain.handle('window:set-mode', (event, mode) => {
  applyMode(mode, true);
});

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide();
  }

  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});
