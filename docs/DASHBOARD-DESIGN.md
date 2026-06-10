# 刘海坞 · 仪表盘设计规格（DASHBOARD-DESIGN）

> 本文是渲染层（`renderer/`）重写的唯一设计依据。所有子任务实现前必须读此文件，
> 任何颜色/圆角/间距/字号/动效都从这里取值，**不得自行发明**。
> 主进程系统层（多屏贴顶、托盘、置顶、PNG 图标）保持不动，只扩展窗口尺寸与新增 IPC。

---

## 0. 产品形态

把原「单一四象限待办」进化为 **3 个 Tab 的桌面 HUD 仪表盘**，从刘海垂下展开：

| Tab | 名称 | 内容 |
|-----|------|------|
| 1（默认） | 首页 Home | 时钟·日期 / 速记 / 快捷链接 / 镜子（摄像头） |
| 2 | 待办 Todo | 现有 P0–P3 四象限（迁移 + 套新材质，数据零丢失） |
| 3 | 应用 Apps | 应用启动坞：搜索 + 全部应用网格 + 收藏，点击真实启动 |

气质关键词：**纯单色、极致冷淡、玻璃厚度、呼吸感**。比对标 Nook X 更克制、更统一。

---

## 1. 设计 Token（唯一取值表）

所有值必须落到 `:root` 的 CSS 自定义属性里，禁止散落硬编码（沿用现有 NEVER 规则）。

### 1.1 颜色 —— 纯单色体系
```
--bg-base:        #000000;                      /* OLED 纯黑底，刘海/面板同色 */
--surface-1:      rgba(255,255,255,0.045);      /* 模块块（tile）默认底 */
--surface-2:      rgba(255,255,255,0.07);       /* tile hover / 次级面 */
--surface-3:      rgba(255,255,255,0.10);       /* 输入框聚焦 / 激活态 */
--hairline:       rgba(255,255,255,0.08);       /* 发丝边框（所有 tile/面板） */
--hairline-soft:  rgba(255,255,255,0.06);
--highlight-top:  rgba(255,255,255,0.07);       /* tile/面板顶部 1px 高光（玻璃厚度） */

--text-1:         rgba(255,255,255,0.92);        /* 主文本 */
--text-2:         rgba(255,255,255,0.55);        /* 次文本 */
--text-3:         rgba(255,255,255,0.40);        /* 标签/提示 */
--text-4:         rgba(255,255,255,0.25);        /* 占位/禁用 */
```

**功能色（全局仅此两类例外，其余一律单色）：**
```
--p0: #FF453A;  --p1: #FF9F0A;  --p2: #FFD60A;  --p3: #30D158;   /* 待办优先级点，沿用既有模型 */
```
- App 原生图标保留自身彩色（启动坞），这是第二类例外。
- 除以上两类，**不得引入任何强调色**：时钟、进度、聚焦边框、激活态全部用白色分级（`--text-*` / `--surface-*`）。

### 1.2 圆角
```
--r-notch: 14px;     /* 折叠态下方两角 */
--r-panel: 24px;     /* 展开面板下方两角 */
--r-tile:  18px;     /* 模块块 */
--r-squircle: 12px;  /* app 图标 / 方钮 */
--r-input: 10px;
--r-pill:  999px;    /* tab 激活胶囊 / 计数 */
```

### 1.3 间距（8pt 体系）
```
--s-1:4px; --s-2:8px; --s-3:12px; --s-4:16px; --s-5:20px; --s-6:24px;
```
面板内边距 16px；tile 内边距 13–15px；tile 间距 12–14px。

### 1.4 字体 / 字号
```
--font: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'PingFang SC', sans-serif;
--font-mono: 'SF Mono', ui-monospace, monospace;
```
数字（时钟、进度、计数）必须 `font-variant-numeric: tabular-nums`（等宽，跳秒不抖）。
| 用途 | 字号 / 字重 / 字距 |
|------|------|
| 时钟 hero | 52px / 500 / -2px |
| 模块标签（小标题） | 11px / 500 / 0.4px / `--text-3` |
| 正文 / 列表项 | 12.5–13px / 400 |
| 次要说明 / 计数 | 10.5–11px / 500 / `--text-3` |
> 字重只用 400 与 500，不用 600/700（克制，避免发胖）。

### 1.5 动效
```
--ease: cubic-bezier(0.32, 0.72, 0, 1);   /* 全局缓动，贴近 iOS 弹性 */
--d-fast: 180ms; --d-base: 240ms; --d-slow: 320ms;
```
- 刘海展开/收起：宽度 320ms、圆角 260ms（沿用现有）。
- Tab 切换：激活胶囊滑动 320ms `--ease`；内容区交叉淡入（旧淡出 140ms → 新淡入 220ms，配 6px Y 位移）。
- tile hover：背景 200ms。
- 一切动效只用 transform + opacity（合成层，禁止动 layout 属性）。

---

## 2. 材质配方（玻璃厚度的关键）

**展开面板（.panel）**
```
background: var(--bg-base);
border: 1px solid var(--hairline);
border-top: none;                  /* 顶边贴屏，无边 */
border-radius: 0 0 var(--r-panel) var(--r-panel);
box-shadow: 0 26px 60px rgba(0,0,0,0.6), inset 0 1px 0 var(--highlight-top);
```
**模块块（.tile）**
```
background: var(--surface-1);
border: 1px solid var(--hairline);
border-radius: var(--r-tile);
box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
transition: background var(--d-base) var(--ease);
```
hover → `background: var(--surface-2)`。
**方钮 / app 图标（.squircle）**
```
border-radius: var(--r-squircle);
box-shadow: inset 0 1px 0 rgba(255,255,255,0.16);   /* 顶部内高光，做出"按钮厚度" */
```

---

## 3. 结构与 Tab 骨架

```
#app.collapsed / #app.expanded
  └─ .notch                      （折叠态，点击展开；逻辑/尺寸不变）
  └─ .panel                      （展开态）
       ├─ .topbar                高 40–44
       │    ├─ .brand            左：18px logo 方钮（中性单色）+ 可选极小字标
       │    ├─ .tabs             分段控件：3 个 .tab（icon + 文案），含滑动激活胶囊 .tab-indicator
       │    └─ .topbar-actions   右：折叠按钮（chevron-up，点击=收起）
       └─ .panels
            ├─ #tab-home  .tab-panel
            ├─ #tab-todo  .tab-panel
            └─ #tab-apps  .tab-panel
```

**Tab 分段控件**：胶囊式（像 iOS Segmented Control）。激活项底 `--surface-2`、文字 `--text-1`；未激活文字 `--text-3`。一个绝对定位的 `.tab-indicator`（圆角胶囊 `--surface-2`）随激活项 `transform: translateX()` 滑动。
**内容切换**：只显示激活 `.tab-panel`（其余 `opacity:0; pointer-events:none; position:absolute`），切换走交叉淡入；面板高度固定（见 §6），不撑动窗口。
**Tab 图标**（内联 SVG，24 viewBox，1.5px 描边，圆角端，currentColor，渲染 ~16px）：
- 首页 home：`<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h12v-9"/>`
- 待办 todo：`<path d="M4 7h10"/><path d="M4 12h10"/><path d="M4 17h7"/><path d="M17.5 7.5 19 9l2.5-3"/>`（清单+勾）
- 应用 apps：四个圆角小方块 `<rect x="4" y="4" width="6.5" height="6.5" rx="2"/>` ×4（2×2）

---

## 4. 首页 Tab（#tab-home）—— bento

布局：上方时钟 hero 横条；下方左「速记」右「快捷链接 + 镜子」。用 CSS grid，三块 tile 风格统一。

- **时钟·日期 tile**：实时更新（每秒）。日期行 `周三 · 6 月 10 日`（`--text-3`，11px）。时间 `10:44` 52px tabular，纯白，**不染色**（对标版分钟是橙色，我们刻意去掉）。可选秒 `:ss` 用 `--text-3` 小号跟随。无定位/天气（本期不做）。
- **速记 tile**：单个自适应 `textarea`，占位「随手记点什么…」，输入即存 `localStorage`（防抖 300ms）。纯文本，monochrome，行高 1.6。Key 见 §7。
- **快捷链接 tile**：用户可增删的链接/路径，渲染成一排 squircle（首字母或 favicon 占位）。点击：URL 走 `shell.openExternal`，本地路径走 `shell.openPath`（经 preload IPC，见 §7）。带一个「+」方钮新增（弹一个极简内联输入：名称 + URL）。
- **镜子 tile**：圆形摄像头预览。**默认不开摄像头**——显示一个含相机图标的占位圆，点击才 `getUserMedia({video})` 激活；离开首页 Tab 或再次点击即 `track.stop()` 释放。圆形用 `border-radius:50%`+`object-fit:cover`。隐私优先。

---

## 5. 待办 Tab（#tab-todo）—— 迁移现有四象限

- 把现有 `index.html` 的 `.sections`（2×2 P0–P3）整体搬进 `#tab-todo`，外观改套 §2 材质（.quadrant → .tile 风格），P0–P3 色点/勾选/计数保留。
- **数据零丢失**：继续用现有 `localStorage` key `notch-todo-data` 与数据结构 `{P0:[],P1:[],P2:[],P3:[]} / item:{id,text,done,createdAt}`。现有 `app.js` 的 `loadData/saveData/addTodo/toggleTodo/deleteTodo` 逻辑全部保留，只改 DOM 容器与样式。
- **连按两次回车提交**：完整保留（armed 态 + 「再按一次回车提交」气泡 + isComposing 忽略 + 失焦/他键重置）。见现有 `app.js`。
- 四象限标题沿用：P0 紧急·重要 / P1 重要·不紧急 / P2 紧急·不重要 / P3 日常·待办。

---

## 6. 应用 Tab（#tab-apps）—— 启动坞

- 顶部一个搜索框（`--surface-1`，聚焦 `--surface-3`，占位「搜索应用…」），实时过滤。
- 下方应用网格：每个 app = squircle 真实图标 + 名称（11px `--text-2`，单行省略）。列数自适应（`grid-template-columns: repeat(auto-fill, minmax(76px,1fr))`），区域内纵向滚动（细滚动条同现有 `.todo-list`）。
- **收藏**：长按或 hover 出现的星标可置顶；收藏存 `localStorage`（key 见 §7），收藏区在网格顶部单独一行「常用」。无收藏时不显示该行。
- 数据来自主进程 IPC（见 §7）：图标已是 dataURL，直接 `<img>`。点击 = IPC 启动。
- 空/加载态：加载时显示骨架或「正在读取应用…」。

---

## 7. 主进程扩展 & IPC 契约（preload 暴露，禁止渲染层直接 require）

**窗口尺寸**（`main.js`）：折叠 `200 × (菜单栏高 + 18px 唇边)`，最小高 38（macOS 菜单栏/物理刘海会拦截其高度带内的点击，必须露出唇边才可点；高度经 `window:metrics` IPC 下发给渲染层写入 `--notch-h`）；展开 **`EXPANDED_WIDTH=620, EXPANDED_HEIGHT=464`**。收起路径：点唇边切换 / 窗口失焦自动收起（`blur` → `window:collapse`）/ Esc 经 `before-input-event` 转发（Escape 不会原生到达页面）。

**preload.js `window.notchAPI` 新增：**
```
setMode(mode)                        // 现有，保留
listApps()        -> Promise<App[]>  // App = { name, path, icon(dataURL) }
launchApp(path)   -> Promise<bool>   // shell.openPath
openExternal(url) -> Promise<void>   // shell.openExternal（快捷链接用 URL）
openPath(p)       -> Promise<void>   // shell.openPath（快捷链接用本地路径）
```
**main.js 新增 handler：**
- `apps:list`：用 `fs.promises.readdir` 扫 `/Applications` 与 `/System/Applications`（含 `Utilities` 子目录可选），筛 `.app`；对每个用 `app.getFileIcon(path,{size:'large'})` 取图标 → `.toDataURL()`；按名排序；结果缓存（首次较慢，之后复用）。
- `apps:launch` → `shell.openPath(path)`；`shell:openExternal` → `shell.openExternal(url)`；`shell:openPath`。
- 安全：launch/openPath 只接受绝对路径且存在；openExternal 仅允许 `http/https`。

**localStorage keys：**
```
notch-todo-data        // 现有待办（勿改）
notch-home-note        // 速记纯文本
notch-quicklinks       // [{id,name,target}]  target 为 url 或本地路径
notch-app-favorites    // [appPath, ...]
notch-active-tab       // 'home' | 'todo' | 'apps'（记住上次所在 Tab）
```

**摄像头打包配置**：`package.json > build.mac.extendInfo` 加 `NSCameraUsageDescription`（中文说明）；`build/entitlements.mac.plist` 加 `com.apple.security.device.camera`。开发期 `npm start` 首次调用会弹系统授权。

---

## 8. NEVER（继承项目铁律）
- NEVER 渲染层直接 `require('electron')`，一切走 preload contextBridge。
- NEVER 让窗口可拖出刘海位；每次显示强制贴顶居中（现有逻辑勿动）。
- NEVER 硬编码颜色/字号/间距，必须用 §1 的 CSS 变量。
- NEVER 提交 node_modules / dist。
- NEVER 摄像头常驻：非激活即释放 track。
- NEVER 破坏 `notch-todo-data` 既有数据与结构。

## 9. 验收口径
- `npm start` 正常启动无报错；点击刘海弹簧展开为 620×464 面板。
- 三 Tab 可切换，激活胶囊滑动顺滑，内容交叉淡入；记住上次 Tab。
- 待办：旧数据仍在；增删勾选、连按两次回车、四象限色点全部如常。
- 首页：时钟实时跳秒等宽；速记自动保存；快捷链接可增删并能打开；镜子点击才开、离开即关。
- 应用：能列出本机应用并显示真实图标；搜索过滤；点击启动；收藏置顶。
- 全程纯单色（除 P0–P3 点与 app 图标）；无硬编码颜色；无 require('electron') 泄漏到渲染层。
