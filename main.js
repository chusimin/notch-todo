const {
  app,
  BrowserWindow,
  screen,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  shell,
  systemPreferences,
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
const COLLAPSED_MIN_HEIGHT = 38;
const NOTCH_LIP = 10; // 折叠黑条在菜单栏下露出的唇边（可点击展开），尽量贴近物理刘海高度

// Per-tab 展开尺寸：窗口总高 = 菜单栏高(透明占位) + EXPANDED_CHROME_Y + panelHeight
const TAB_SIZES = {
  home: { width: 980, panelHeight: 196 }, // 横向 HUD 条
  todo: { width: 1080, panelHeight: 300 }, // 四列并排
  apps: { width: 1120, panelHeight: 540 }, // 大网格
};
// 与渲染层结构常量对应：panel padding-top(--s-3 12) + 顶栏(--topbar-h 40)
// + panels margin-top(--s-3 12) + panel padding-bottom(--s-4 16)
const EXPANDED_CHROME_Y = 80;
const SCREEN_MARGIN = 24; // 宽度超屏时两侧保留的安全边

let mainWindow = null;
let tray = null;
let currentMode = 'collapsed';
let currentTab = 'home';

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

// 窗口当前所在屏：模式切换 / Tab 变形必须锚定在这块屏上。
// 若跟随光标（getTargetDisplay），失焦收起瞬间会把刘海"瞬移"到光标所在的另一块屏。
function getWindowDisplay() {
  try {
    if (mainWindow) return screen.getDisplayMatching(mainWindow.getBounds());
  } catch (e) {
    // fallthrough
  }
  return getTargetDisplay();
}

function getCenteredBounds(width, height, display) {
  const d = display || getTargetDisplay();
  return {
    x: Math.round(d.bounds.x + (d.bounds.width - width) / 2),
    y: d.bounds.y, // 副屏的 y 不一定是 0，可能是负数（如外接屏在主屏上方）
    width,
    height,
  };
}

// macOS 菜单栏会拦截其高度带内的所有鼠标点击（即使窗口绘制在其上方），
// 刘海屏机型菜单栏高约 37pt，折叠态必须在菜单栏下方露出一段"唇边"才可点击。
function getMenuBarHeight(display) {
  return Math.max(0, display.workArea.y - display.bounds.y);
}

function getCollapsedHeight(display) {
  return Math.max(COLLAPSED_MIN_HEIGHT, getMenuBarHeight(display) + NOTCH_LIP);
}

// 展开尺寸按当前 Tab 取值；宽度超出屏幕时 clamp 到工作区内
function getExpandedSize(display) {
  const size = TAB_SIZES[currentTab] || TAB_SIZES.home;
  return {
    width: Math.min(size.width, display.workArea.width - SCREEN_MARGIN),
    height: getMenuBarHeight(display) + EXPANDED_CHROME_Y + size.panelHeight,
  };
}

// display 不传时锚定窗口当前所在屏；只有"召唤"类动作（启动/重新居中/显示）才传光标屏。
// 一律瞬时 setBounds：系统动画 resize 会持续重绘 web 内容（卡顿），
// 平滑感统一交给渲染层 CSS（面板入退场 + morphToTab 宽高补间）。
function applyMode(mode, display) {
  if (!mainWindow) return;
  const d = display || getWindowDisplay();
  let width;
  let height;
  if (mode === 'expanded') {
    ({ width, height } = getExpandedSize(d));
  } else {
    width = COLLAPSED_WIDTH;
    height = getCollapsedHeight(d);
  }
  mainWindow.setBounds(getCenteredBounds(width, height, d));
  currentMode = mode;
}

function createWindow() {
  const initial = getCenteredBounds(COLLAPSED_WIDTH, getCollapsedHeight(getTargetDisplay()));

  mainWindow = new BrowserWindow({
    width: initial.width,
    height: initial.height,
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

  // Escape 在到达页面前会被 Chromium 浏览器层吞掉（实测 document keydown 收不到），
  // 用 before-input-event 在分发前拦截并转发给渲染层处理（退出输入 / 收起面板）
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') {
      mainWindow.webContents.send('key:escape');
    }
  });

  // 点击面板以外的任何地方（窗口失焦）→ 自动收起，HUD 的自然行为
  mainWindow.on('blur', () => {
    if (currentMode === 'expanded') {
      applyMode('collapsed');
      mainWindow.webContents.send('window:collapse');
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    applyMode('collapsed');
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
    applyMode(currentMode, getTargetDisplay()); // 显示前先回到鼠标所在屏顶部
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
      click: () => applyMode(currentMode, getTargetDisplay()),
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
  applyMode(mode);
});

ipcMain.handle('window:metrics', () => {
  const d = getWindowDisplay();
  return {
    stripHeight: getCollapsedHeight(d), // 折叠黑条总高（菜单栏 + 唇边）
    menuBarHeight: getMenuBarHeight(d), // 展开态顶部透明占位高
    chromeY: EXPANDED_CHROME_Y, // 面板结构高（morphToTab 计算目标 px 用）
    tabSizes: TAB_SIZES,
  };
});

// 渲染层切 Tab 时同步：记录当前 Tab，展开态下平滑变形到该 Tab 的尺寸（仍贴顶居中）
ipcMain.handle('window:set-tab', (event, tab) => {
  currentTab = Object.prototype.hasOwnProperty.call(TAB_SIZES, tab) ? tab : 'home';
  if (currentMode === 'expanded') applyMode('expanded');
});

// macOS 渲染层 getUserMedia 不会自动弹 TCC 授权，必须由主进程申请摄像头权限
ipcMain.handle('media:camera', async () => {
  if (process.platform !== 'darwin') return true;
  if (systemPreferences.getMediaAccessStatus('camera') === 'granted') return true;
  return systemPreferences.askForMediaAccess('camera');
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

// 图标直接从 .app/Contents/Resources/*.icns 提取内嵌 PNG。
// 不用 app.getFileIcon：它在部分 .app 上会触发 Electron 内部 FATAL Check 崩溃，
// C++ 级断言 try/catch 接不住，会把整个 apps:list 打死。
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
// icns 内 PNG 块按"贴近 48px 网格展示"优先：128 → 256 → 64@2x …
const ICNS_PREF = ['ic07', 'ic12', 'ic08', 'ic11', 'ic13', 'ic09', 'ic14', 'ic05', 'ic04'];

function extractPngFromIcns(buf) {
  if (buf.length < 8 || buf.toString('ascii', 0, 4) !== 'icns') return null;
  const candidates = [];
  let off = 8;
  while (off + 8 <= buf.length) {
    const type = buf.toString('ascii', off, off + 4);
    const len = buf.readUInt32BE(off + 4);
    if (len < 8 || off + len > buf.length) break;
    const data = buf.subarray(off + 8, off + len);
    if (data.length > 8 && data.subarray(0, 4).equals(PNG_SIG)) {
      candidates.push({ type, data });
    }
    off += len;
  }
  if (!candidates.length) return null; // 老式 RLE 图标 → 交给渲染层首字母兜底
  candidates.sort((a, b) => {
    const ia = ICNS_PREF.indexOf(a.type);
    const ib = ICNS_PREF.indexOf(b.type);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  return candidates[0].data;
}

async function readAppIcon(appPath) {
  try {
    const resDir = path.join(appPath, 'Contents', 'Resources');
    const files = await fs.promises.readdir(resDir);
    const icns = files.filter((f) => f.toLowerCase().endsWith('.icns'));
    if (!icns.length) return null;
    // 优先 AppIcon.icns，其次名字含 app/icon 的，避免选中文档类型图标
    const score = (n) => {
      const s = n.toLowerCase();
      if (s === 'appicon.icns') return 0;
      if (s.includes('app')) return 1;
      if (s.includes('icon')) return 2;
      return 3;
    };
    icns.sort((a, b) => score(a) - score(b) || a.length - b.length);
    const buf = await fs.promises.readFile(path.join(resDir, icns[0]));
    const png = extractPngFromIcns(buf);
    return png ? `data:image/png;base64,${png.toString('base64')}` : null;
  } catch (e) {
    return null; // 单个应用读不到图标不影响整体
  }
}

// 云挂载/损坏的 .app（如网盘类应用）的文件读取可能永远不返回，
// 单图标必须限时，否则一个卡死的 readFile 会拖死整个扫描
const ICON_TIMEOUT_MS = 1200;
const ICON_CONCURRENCY = 12;

function withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

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
      result.push({ name, path: path.join(dir, entry), icon: null });
    }
  }

  // 有界并发 + 单图标超时：取不到图标就置 null（渲染层有首字母兜底）
  let cursor = 0;
  async function iconWorker() {
    while (cursor < result.length) {
      const item = result[cursor++];
      item.icon = await withTimeout(readAppIcon(item.path), ICON_TIMEOUT_MS, null);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(ICON_CONCURRENCY, result.length || 1) }, iconWorker)
  );

  result.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  return result;
}

let appsScanPromise = null; // 在途扫描去重：反复进出应用 Tab 不会叠加多个全量扫描

ipcMain.handle('apps:list', async (event, force) => {
  if (appsCache && !force) return appsCache;
  if (!appsScanPromise) {
    appsScanPromise = scanApps()
      .then((list) => {
        appsCache = list;
        return list;
      })
      .finally(() => {
        appsScanPromise = null;
      });
  }
  return appsScanPromise;
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
      if (mainWindow) applyMode(currentMode);
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
