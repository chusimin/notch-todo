const STORAGE_KEY = 'notch-todo-data';
const PRIORITIES = ['P0', 'P1', 'P2', 'P3'];

const app = document.getElementById('app');
const notch = document.getElementById('notch');
const panel = document.getElementById('panel');

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { P0: [], P1: [], P2: [], P3: [] };
    const parsed = JSON.parse(raw);
    return {
      P0: Array.isArray(parsed.P0) ? parsed.P0 : [],
      P1: Array.isArray(parsed.P1) ? parsed.P1 : [],
      P2: Array.isArray(parsed.P2) ? parsed.P2 : [],
      P3: Array.isArray(parsed.P3) ? parsed.P3 : [],
    };
  } catch (e) {
    return { P0: [], P1: [], P2: [], P3: [] };
  }
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // ignore quota errors
  }
}

let data = loadData();

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function checkSvg() {
  return '<svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderList(priority) {
  const list = document.querySelector(`.todo-list[data-priority="${priority}"]`);
  if (!list) return;
  const items = data[priority] || [];
  list.innerHTML = items
    .map((item) => {
      const doneClass = item.done ? ' done' : '';
      const safeText = escapeHtml(item.text);
      return `
        <li class="todo-item${doneClass}" data-id="${item.id}" data-priority="${priority}">
          <button class="checkbox" data-action="toggle">${checkSvg()}</button>
          <span class="todo-text">${safeText}</span>
          <button class="delete" data-action="delete" aria-label="删除">×</button>
        </li>
      `;
    })
    .join('');
}

function updateCount(priority) {
  const countEl = document.querySelector(`.count[data-priority="${priority}"]`);
  if (!countEl) return;
  const items = data[priority] || [];
  const pending = items.filter((t) => !t.done).length;
  countEl.textContent = String(pending);
}

function renderAll() {
  PRIORITIES.forEach((p) => {
    renderList(p);
    updateCount(p);
  });
}

function addTodo(priority, text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  data[priority].push({
    id: generateId(),
    text: trimmed,
    done: false,
    createdAt: Date.now(),
  });
  saveData(data);
  renderList(priority);
  updateCount(priority);
}

function toggleTodo(priority, id) {
  const list = data[priority];
  const idx = list.findIndex((t) => t.id === id);
  if (idx === -1) return;
  list[idx].done = !list[idx].done;
  saveData(data);
  renderList(priority);
  updateCount(priority);
}

function deleteTodo(priority, id) {
  data[priority] = data[priority].filter((t) => t.id !== id);
  saveData(data);
  renderList(priority);
  updateCount(priority);
}

let isExpanded = false;

async function setMode(expanded) {
  if (expanded === isExpanded) return;
  isExpanded = expanded;
  if (expanded) {
    app.classList.remove('collapsed');
    app.classList.add('expanded');
  } else {
    app.classList.remove('expanded');
    app.classList.add('collapsed');
    // 收起窗口即释放摄像头（窗口此时隐藏，禁止常驻）
    stopMirror();
  }
  if (expanded) {
    // 展开后面板从隐藏变为可见，tab 尺寸此时才可量，校准激活胶囊位置
    requestAnimationFrame(() => requestAnimationFrame(positionIndicator));
  }
  if (window.notchAPI && typeof window.notchAPI.setMode === 'function') {
    try {
      await window.notchAPI.setMode(expanded ? 'expanded' : 'collapsed');
    } catch (e) {
      // ignore
    }
  }
}

notch.addEventListener('click', (e) => {
  e.stopPropagation();
  setMode(!isExpanded);
});

panel.addEventListener('click', (e) => {
  e.stopPropagation();
});

// ============ Tab 切换 ============
const TAB_KEY = 'notch-active-tab';
const TABS = ['home', 'todo', 'apps'];
const tabButtons = Array.from(document.querySelectorAll('.tab'));
const tabPanels = Array.from(document.querySelectorAll('.tab-panel'));
const tabIndicator = document.getElementById('tab-indicator');
const collapseBtn = document.getElementById('collapse-btn');

let activeTab = 'home';

function positionIndicator() {
  const btn = tabButtons.find((b) => b.dataset.tab === activeTab);
  if (!btn || !tabIndicator) return;
  tabIndicator.style.width = `${btn.offsetWidth}px`;
  tabIndicator.style.transform = `translateX(${btn.offsetLeft}px)`;
}

function setActiveTab(name) {
  if (!TABS.includes(name)) name = 'home';
  activeTab = name;
  // 离开首页即释放摄像头（隐私优先，禁止常驻）
  if (name !== 'home') stopMirror();
  // 进入应用 Tab 才懒加载应用列表
  if (name === 'apps') ensureAppsLoaded();
  tabButtons.forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  tabPanels.forEach((p) => p.classList.toggle('active', p.id === `tab-${name}`));
  positionIndicator();
  try {
    localStorage.setItem(TAB_KEY, name);
  } catch (e) {
    // ignore quota errors
  }
}

tabButtons.forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    setActiveTab(btn.dataset.tab);
  });
});

if (collapseBtn) {
  collapseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setMode(false);
  });
}

function initTab() {
  let saved = 'home';
  try {
    const stored = localStorage.getItem(TAB_KEY);
    if (stored && TABS.includes(stored)) saved = stored;
  } catch (e) {
    // ignore
  }
  setActiveTab(saved);
}

PRIORITIES.forEach((priority) => {
  const input = document.querySelector(`.add-row input[data-priority="${priority}"]`);
  if (!input) return;
  const row = input.closest('.add-row');

  // 连按两次回车才提交：第一次回车进入“待确认”状态，第二次回车真正提交。
  // 中途继续输入（按下其它键）或输入框失焦都会重置，必须是连续两次回车。
  let armed = false;

  function disarm() {
    if (!armed) return;
    armed = false;
    if (row) row.classList.remove('armed');
  }

  input.addEventListener('keydown', (e) => {
    if (e.isComposing) return; // 输入法组合输入中，忽略
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!input.value.trim()) {
        disarm();
        return;
      }
      if (armed) {
        addTodo(priority, input.value);
        input.value = '';
        disarm();
      } else {
        armed = true;
        if (row) row.classList.add('armed');
      }
      return;
    }
    // 任意其它按键都重置确认，确保必须是连续两次回车
    disarm();
  });

  input.addEventListener('blur', disarm);
});

PRIORITIES.forEach((priority) => {
  const list = document.querySelector(`.todo-list[data-priority="${priority}"]`);
  if (!list) return;
  list.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const item = target.closest('.todo-item');
    if (!item) return;
    const id = item.dataset.id;
    const action = target.dataset.action;
    if (action === 'toggle') {
      toggleTodo(priority, id);
    } else if (action === 'delete') {
      deleteTodo(priority, id);
    }
  });
});

// ============ 首页 · 时钟·日期 ============
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const clockDateEl = document.getElementById('clock-date');
const clockHmEl = document.getElementById('clock-hm');
const clockSsEl = document.getElementById('clock-ss');

function pad2(n) {
  return n < 10 ? '0' + n : String(n);
}

function tickClock() {
  if (!clockHmEl) return;
  const now = new Date();
  const hm = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  if (clockHmEl.textContent !== hm) clockHmEl.textContent = hm;
  if (clockSsEl) clockSsEl.textContent = pad2(now.getSeconds());
  if (clockDateEl) {
    const dateStr = `${WEEKDAYS[now.getDay()]} · ${now.getMonth() + 1} 月 ${now.getDate()} 日`;
    if (clockDateEl.textContent !== dateStr) clockDateEl.textContent = dateStr;
  }
}

tickClock();
setInterval(tickClock, 1000);

// ============ 首页 · 速记（防抖存储） ============
const NOTE_KEY = 'notch-home-note';
const noteInput = document.getElementById('home-note');

if (noteInput) {
  try {
    noteInput.value = localStorage.getItem(NOTE_KEY) || '';
  } catch (e) {
    // ignore
  }
  let noteTimer = null;
  noteInput.addEventListener('input', () => {
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => {
      try {
        localStorage.setItem(NOTE_KEY, noteInput.value);
      } catch (e) {
        // ignore quota errors
      }
    }, 300);
  });
}

// ============ 首页 · 快捷链接 ============
const LINKS_KEY = 'notch-quicklinks';
const linksGrid = document.getElementById('links-grid');
const linkAddBtn = document.getElementById('link-add-btn');
const linkForm = document.getElementById('link-form');
const linkNameInput = document.getElementById('link-name');
const linkTargetInput = document.getElementById('link-target');

function loadLinks() {
  try {
    const raw = localStorage.getItem(LINKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l) => l && typeof l.target === 'string' && typeof l.name === 'string'
    );
  } catch (e) {
    return [];
  }
}

function saveLinks(list) {
  try {
    localStorage.setItem(LINKS_KEY, JSON.stringify(list));
  } catch (e) {
    // ignore quota errors
  }
}

let links = loadLinks();

function isHttpUrl(s) {
  return /^https?:\/\//i.test(s);
}

const globeSvg =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M4 12h16"/><path d="M12 4a12 12 0 0 1 0 16 12 12 0 0 1 0-16z"/></svg>';

function linkGlyph(link) {
  if (isHttpUrl(link.target)) return globeSvg;
  const ch = (link.name || link.target).trim().charAt(0) || '·';
  return `<span class="link-glyph">${escapeHtml(ch)}</span>`;
}

function renderLinks() {
  if (!linksGrid) return;
  if (links.length === 0) {
    linksGrid.innerHTML = '<div class="links-empty">点 + 添加常用链接</div>';
    return;
  }
  linksGrid.innerHTML = links
    .map((link) => {
      return `
        <div class="link-item" data-id="${link.id}">
          <button class="link-btn" data-action="open" title="${escapeHtml(link.name)}">${linkGlyph(link)}</button>
          <button class="link-del" data-action="del" aria-label="删除">×</button>
        </div>
      `;
    })
    .join('');
}

function openLink(link) {
  if (!link || !window.notchAPI) return;
  if (isHttpUrl(link.target)) {
    if (typeof window.notchAPI.openExternal === 'function') {
      window.notchAPI.openExternal(link.target).catch(() => {});
    }
  } else if (typeof window.notchAPI.openPath === 'function') {
    window.notchAPI.openPath(link.target).catch(() => {});
  }
}

function addLink(name, target) {
  const t = target.trim();
  if (!t) return false;
  const n = name.trim() || t;
  links.push({ id: generateId(), name: n, target: t });
  saveLinks(links);
  renderLinks();
  return true;
}

function deleteLink(id) {
  links = links.filter((l) => l.id !== id);
  saveLinks(links);
  renderLinks();
}

function openLinkForm() {
  if (!linkForm) return;
  linkForm.classList.add('open');
  if (linkNameInput) linkNameInput.focus();
}

function closeLinkForm() {
  if (!linkForm) return;
  linkForm.classList.remove('open');
  if (linkNameInput) linkNameInput.value = '';
  if (linkTargetInput) linkTargetInput.value = '';
}

if (linkAddBtn) {
  linkAddBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (linkForm && linkForm.classList.contains('open')) {
      closeLinkForm();
    } else {
      openLinkForm();
    }
  });
}

if (linkForm) {
  linkForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = addLink(
      linkNameInput ? linkNameInput.value : '',
      linkTargetInput ? linkTargetInput.value : ''
    );
    if (ok) closeLinkForm();
  });
  [linkNameInput, linkTargetInput].forEach((inp) => {
    if (!inp) return;
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeLinkForm();
      }
    });
  });
}

if (linksGrid) {
  linksGrid.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const item = target.closest('.link-item');
    if (!item) return;
    const id = item.dataset.id;
    const action = target.dataset.action;
    if (action === 'open') {
      const link = links.find((l) => l.id === id);
      openLink(link);
    } else if (action === 'del') {
      deleteLink(id);
    }
  });
}

renderLinks();

// ============ 首页 · 镜子（摄像头，隐私优先） ============
const homeMirror = document.querySelector('.home-mirror');
const mirrorStage = document.getElementById('mirror-stage');
const mirrorVideo = document.getElementById('mirror-video');
const mirrorHint = document.getElementById('mirror-hint');

let mirrorStream = null;
let mirrorStarting = false;

function stopMirror() {
  if (mirrorStream) {
    try {
      mirrorStream.getTracks().forEach((t) => t.stop());
    } catch (e) {
      // ignore
    }
    mirrorStream = null;
  }
  if (mirrorVideo) {
    try {
      mirrorVideo.srcObject = null;
    } catch (e) {
      // ignore
    }
  }
  if (homeMirror) homeMirror.classList.remove('live');
  if (mirrorHint) mirrorHint.textContent = '点按开启';
}

async function startMirror() {
  if (mirrorStarting || mirrorStream) return;
  mirrorStarting = true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false,
    });
    // 启动期间若已离开首页/收起，立即丢弃避免常驻
    if (activeTab !== 'home' || !isExpanded) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    mirrorStream = stream;
    if (mirrorVideo) {
      mirrorVideo.srcObject = stream;
      mirrorVideo.play().catch(() => {});
    }
    if (homeMirror) homeMirror.classList.add('live');
  } catch (e) {
    if (mirrorHint) mirrorHint.textContent = '无法访问摄像头';
  } finally {
    mirrorStarting = false;
  }
}

if (mirrorStage) {
  mirrorStage.addEventListener('click', (e) => {
    e.stopPropagation();
    if (mirrorStream) {
      stopMirror();
    } else {
      startMirror();
    }
  });
}

// ============ 应用 · 启动坞 ============
const APP_FAV_KEY = 'notch-app-favorites';
const appsScroll = document.getElementById('apps-scroll');
const appsLoadingEl = document.getElementById('apps-loading');
const appsFavSection = document.getElementById('apps-fav-section');
const appsFavGrid = document.getElementById('apps-fav');
const appsAllSection = document.getElementById('apps-all-section');
const appsAllGrid = document.getElementById('apps-all');
const appsEmptyEl = document.getElementById('apps-empty');
const appsSearchInput = document.getElementById('apps-search');

let appsCache = null; // [{name, path, icon}]
let appsLoadState = 'idle'; // idle | loading | ready | error
let appsSearchTerm = '';

function loadAppFavorites() {
  try {
    const raw = localStorage.getItem(APP_FAV_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) => typeof p === 'string');
  } catch (e) {
    return [];
  }
}

function saveAppFavorites(list) {
  try {
    localStorage.setItem(APP_FAV_KEY, JSON.stringify(list));
  } catch (e) {
    // ignore quota errors
  }
}

let appFavorites = loadAppFavorites();

const starOutlineSvg =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4l2.35 4.76 5.25.76-3.8 3.7.9 5.23L12 16.9l-4.7 2.47.9-5.23-3.8-3.7 5.25-.76z"/></svg>';
const starFilledSvg =
  '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M12 4l2.35 4.76 5.25.76-3.8 3.7.9 5.23L12 16.9l-4.7 2.47.9-5.23-3.8-3.7 5.25-.76z"/></svg>';

function appGlyph(name) {
  const ch = (name || '').trim().charAt(0) || '·';
  return `<span class="app-glyph">${escapeHtml(ch)}</span>`;
}

function appItemHtml(appInfo, faved) {
  const safeName = escapeHtml(appInfo.name);
  const iconInner = appInfo.icon
    ? `<img src="${escapeHtml(appInfo.icon)}" alt="" draggable="false" />`
    : appGlyph(appInfo.name);
  const favClass = faved ? ' faved' : '';
  const star = faved ? starFilledSvg : starOutlineSvg;
  const favLabel = faved ? '取消收藏' : '收藏';
  return `
    <div class="app-item" data-path="${escapeHtml(appInfo.path)}" data-action="launch" title="${safeName}">
      <button class="app-fav-toggle${favClass}" data-action="fav" aria-label="${favLabel}">${star}</button>
      <div class="app-icon">${iconInner}</div>
      <span class="app-name">${safeName}</span>
    </div>
  `;
}

function renderApps() {
  if (appsLoadState !== 'ready' || !appsCache) return;
  const favSet = new Set(appFavorites);
  const term = appsSearchTerm.trim().toLowerCase();
  const filtering = term.length > 0;

  // 全部应用（过滤后）
  const matched = filtering
    ? appsCache.filter((a) => a.name.toLowerCase().includes(term))
    : appsCache;

  if (appsAllGrid) {
    appsAllGrid.innerHTML = matched
      .map((a) => appItemHtml(a, favSet.has(a.path)))
      .join('');
  }

  // 常用区：仅非搜索态显示，按收藏顺序在 cache 中找
  let favApps = [];
  if (!filtering) {
    favApps = appFavorites
      .map((p) => appsCache.find((a) => a.path === p))
      .filter(Boolean);
  }
  if (appsFavGrid) {
    appsFavGrid.innerHTML = favApps.map((a) => appItemHtml(a, true)).join('');
  }
  if (appsFavSection) appsFavSection.hidden = filtering || favApps.length === 0;

  // 全部分区标题：搜索态下隐藏（结果已是全部内容），无结果时也隐藏
  if (appsAllSection) appsAllSection.hidden = matched.length === 0;
  if (appsEmptyEl) appsEmptyEl.hidden = matched.length > 0;
}

function setAppsLoading(isLoading) {
  if (appsLoadingEl) appsLoadingEl.hidden = !isLoading;
}

async function ensureAppsLoaded() {
  if (appsLoadState === 'loading' || appsLoadState === 'ready') return;
  if (!window.notchAPI || typeof window.notchAPI.listApps !== 'function') {
    appsLoadState = 'error';
    if (appsLoadingEl) {
      appsLoadingEl.textContent = '无法读取应用';
      appsLoadingEl.hidden = false;
    }
    return;
  }
  appsLoadState = 'loading';
  setAppsLoading(true);
  try {
    const list = await window.notchAPI.listApps();
    appsCache = Array.isArray(list) ? list : [];
    appsLoadState = 'ready';
    setAppsLoading(false);
    renderApps();
  } catch (e) {
    appsLoadState = 'error';
    if (appsLoadingEl) {
      appsLoadingEl.textContent = '无法读取应用';
      appsLoadingEl.hidden = false;
    }
  }
}

function launchApp(path) {
  if (!path || !window.notchAPI || typeof window.notchAPI.launchApp !== 'function')
    return;
  window.notchAPI.launchApp(path).catch(() => {});
}

function toggleAppFavorite(path) {
  if (appFavorites.includes(path)) {
    appFavorites = appFavorites.filter((p) => p !== path);
  } else {
    appFavorites.push(path);
  }
  saveAppFavorites(appFavorites);
  renderApps();
}

// 事件委托：滚动容器内监听 launch / fav
if (appsScroll) {
  appsScroll.addEventListener('click', (e) => {
    e.stopPropagation();
    const favBtn = e.target.closest('[data-action="fav"]');
    if (favBtn) {
      const item = favBtn.closest('.app-item');
      if (item) toggleAppFavorite(item.dataset.path);
      return;
    }
    const item = e.target.closest('.app-item[data-action="launch"]');
    if (item) launchApp(item.dataset.path);
  });
}

if (appsSearchInput) {
  appsSearchInput.addEventListener('input', () => {
    appsSearchTerm = appsSearchInput.value;
    renderApps();
  });
}

renderAll();
initTab();
