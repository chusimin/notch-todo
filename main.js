const {
  app,
  BrowserWindow,
  screen,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  shell,
} = require('electron');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

// ============ 托盘图标 PNG 生成 ============
// 直接在主进程编码 PNG，避免引入额外资源文件
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, pixels) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const off = y * (1 + width * 4);
    scanlines[off] = 0;
    pixels.copy(scanlines, off + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(scanlines);
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// 生成刘海形状：扁平顶 + 圆角底，居中偏上
function makeNotchPng(scale) {
  const size = 16 * scale;
  const pixels = Buffer.alloc(size * size * 4);

  // 形状参数（pt 单位 × scale）
  const W = 10 * scale; // 刘海宽
  const H = 5 * scale; // 刘海高
  const R = 2 * scale; // 下方圆角半径
  const x0 = (size - W) / 2;
  const y0 = 3.5 * scale; // 距顶 padding

  function isInside(px, py) {
    if (px < x0 || px > x0 + W || py < y0 || py > y0 + H) return false;
    const bottomR = y0 + H - R;
    if (py < bottomR) return true;
    const leftR = x0 + R;
    const rightR = x0 + W - R;
    if (px >= leftR && px <= rightR) return true;
    if (px < leftR) {
      const dx = leftR - px;
      const dy = py - bottomR;
      return dx * dx + dy * dy <= R * R;
    }
    const dx = px - rightR;
    const dy = py - bottomR;
    return dx * dx + dy * dy <= R * R;
  }

  // 4×4 超采样抗锯齿
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let count = 0;
      for (let sy = 0; sy < 4; sy++) {
        for (let sx = 0; sx < 4; sx++) {
          if (isInside(x + (sx + 0.5) / 4, y + (sy + 0.5) / 4)) count++;
        }
      }
      const alpha = Math.round((count / 16) * 255);
      const idx = (y * size + x) * 4;
      pixels[idx + 3] = alpha;
    }
  }

  return encodePng(size, size, pixels);
}

function createNotchTrayIcon() {
  const png2x = makeNotchPng(2);
  const icon = nativeImage.createFromBuffer(png2x, { scaleFactor: 2 });
  icon.setTemplateImage(true);
  return icon;
}

const COLLAPSED_WIDTH = 200;
const COLLAPSED_HEIGHT = 32;
const EXPANDED_WIDTH = 620;
const EXPANDED_HEIGHT = 464;

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

// 多屏适配：定位到"鼠标当前所在屏"的物理顶端居中
// 这样接上外接屏后，无论副屏在主屏的左/右/上/下，刘海都跟着用户视线走
function getTargetDisplay() {
  try {
    const cursor = screen.getCursorScreenPoint();
    return screen.getDisplayNearestPoint(cursor);
  } catch (e) {
    return screen.getPrimaryDisplay();
  }
}

function getCenteredBounds(width, height) {
  const d = getTargetDisplay();
  return {
    x: Math.round(d.bounds.x + (d.bounds.width - width) / 2),
    y: d.bounds.y, // 副屏的 y 不一定是 0，可能是负数（如外接屏在主屏上方）
    width,
    height,
  };
}

function applyMode(mode, animate) {
  if (!mainWindow) return;
  const width = mode === 'expanded' ? EXPANDED_WIDTH : COLLAPSED_WIDTH;
  const height = mode === 'expanded' ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;
  mainWindow.setBounds(getCenteredBounds(width, height), animate);
  currentMode = mode;
}

function createWindow() {
  const initial = getCenteredBounds(COLLAPSED_WIDTH, COLLAPSED_HEIGHT);

  mainWindow = new BrowserWindow({
    width: COLLAPSED_WIDTH,
    height: COLLAPSED_HEIGHT,
    x: initial.x,
    y: initial.y,
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
    applyMode(currentMode, false); // 显示前先回到鼠标所在屏顶部
    mainWindow.show();
  }
  refreshTrayMenu();
}

function isAutoLaunchEnabled() {
  if (process.platform !== 'darwin') return false;
  try {
    return app.getLoginItemSettings().openAtLogin;
  } catch (e) {
    return false;
  }
}

function setAutoLaunch(enabled) {
  if (process.platform !== 'darwin') return;
  try {
    app.setLoginItemSettings({ openAtLogin: enabled, openAsHidden: false });
  } catch (e) {
    // ignore
  }
}

function refreshTrayMenu() {
  if (!tray) return;
  const visible = !!(mainWindow && mainWindow.isVisible());
  const autoLaunch = isAutoLaunchEnabled();
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
      label: '开机自动启动',
      type: 'checkbox',
      checked: autoLaunch,
      click: (item) => {
        setAutoLaunch(item.checked);
        refreshTrayMenu();
      },
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
  tray = new Tray(createNotchTrayIcon());
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

// 快捷链接：URL 走外部浏览器（仅 http/https），本地路径走系统打开（仅绝对路径）
ipcMain.handle('shell:openExternal', (event, url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
    return shell.openExternal(url);
  }
});

ipcMain.handle('shell:openPath', (event, p) => {
  if (typeof p === 'string' && path.isAbsolute(p)) {
    return shell.openPath(p);
  }
});

// ============ 应用启动坞 ============
// 扫这些目录里的 .app；目录不存在直接跳过。
const APP_DIRS = [
  '/Applications',
  '/Applications/Utilities',
  '/System/Applications',
  '/System/Applications/Utilities',
];

let appsCache = null; // 首次扫盘较慢，结果缓存复用

async function scanApps() {
  const seen = new Set(); // 按应用名去重，同名保留首个
  const result = [];

  for (const dir of APP_DIRS) {
    let entries;
    try {
      entries = await fs.promises.readdir(dir);
    } catch (e) {
      continue; // 目录不存在/无权限 → 跳过，不报错
    }
    for (const entry of entries) {
      if (!entry.endsWith('.app')) continue;
      const name = entry.slice(0, -4);
      if (seen.has(name)) continue;
      seen.add(name);
      const fullPath = path.join(dir, entry);
      let icon = null;
      try {
        const img = await app.getFileIcon(fullPath, { size: 'large' });
        icon = img.toDataURL();
      } catch (e) {
        icon = null; // 单个图标失败不影响整体
      }
      result.push({ name, path: fullPath, icon });
    }
  }

  result.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  return result;
}

ipcMain.handle('apps:list', async (event, force) => {
  if (appsCache && !force) return appsCache;
  appsCache = await scanApps();
  return appsCache;
});

ipcMain.handle('apps:launch', (event, p) => {
  if (
    typeof p === 'string' &&
    path.isAbsolute(p) &&
    p.endsWith('.app') &&
    fs.existsSync(p)
  ) {
    shell.openPath(p);
    return true;
  }
  return false;
});

function ensureFirstRunAutoLaunch() {
  // 首次运行时默认开启开机自启；之后尊重用户在托盘菜单的选择
  if (process.platform !== 'darwin') return;
  const marker = path.join(app.getPath('userData'), '.first-run-done');
  if (fs.existsSync(marker)) return;
  try {
    setAutoLaunch(true);
    fs.writeFileSync(marker, String(Date.now()));
  } catch (e) {
    // ignore
  }
}

function watchDisplayChanges() {
  // 接/拔外接屏、改变屏幕排列、改分辨率 → 自动重新定位到当前活跃屏顶部居中
  // 加 100ms 防抖：插拔屏时系统会连续触发多次事件
  let timer = null;
  const reposition = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (mainWindow) applyMode(currentMode, false);
    }, 100);
  };
  screen.on('display-added', reposition);
  screen.on('display-removed', reposition);
  screen.on('display-metrics-changed', reposition);
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide();
  }

  ensureFirstRunAutoLaunch();
  createWindow();
  createTray();
  watchDisplayChanges();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});
