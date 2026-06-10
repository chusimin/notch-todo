# 刘海坞 NotchDock

> 一个常驻 macOS 屏幕顶部刘海位置的纯单色玻璃仪表盘。默认折叠成刘海大小，点击从刘海垂下展开，
> 含 **首页 / 待办 / 应用** 三个 Tab。再次点击顶部刘海条收起。

![平台](https://img.shields.io/badge/platform-macOS-blue?style=flat-square)
![架构](https://img.shields.io/badge/arch-Apple%20Silicon-orange?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![无依赖](https://img.shields.io/badge/runtime-Electron%2033-9cf?style=flat-square)

---

## 它长什么样

```
       折叠态                            展开态（首页 980 / 待办 1080 / 应用 1120 宽）
   ┌──────────┐               ┌──────────────────────────────────────────┐
   │   刘海   │   ──点击──>   │ ◍ [ 首页 ][ 待办 ][ 应用 ]              ⌃ │
   └──────────┘               │ ┌──────┬─────────┬──────────────┬─────┐ │
       ↑                      │ │10:44 │ 快捷应用 │    速记      │镜子◯│ │
  200×(菜单栏+18)             │ │周三6/10│ ▢ ▢ ▢ │              │     │ │
   贴顶居中                    │ └──────┴─────────┴──────────────┴─────┘ │
                              └──────────────────────────────────────────┘
```

- 纯黑底（OLED #000000）+ 发丝边框 + 顶部高光，做出玻璃厚度与呼吸感
- 全程**纯单色**，强调色仅用于待办 P0–P3 色点、时钟点缀与应用原生图标
- 左上分段控件切换三 Tab，激活胶囊滑动 + 内容交叉淡入，**每个 Tab 独立窗口尺寸**平滑变形，记住上次所在 Tab
- 启动/重新居中跟随鼠标所在屏；展开/收起/切 Tab 锚定窗口所在屏（不跟光标跨屏瞬移）
- 菜单栏小图标用 template image 自动深浅色适配

---

## 三个 Tab

| Tab | 能力 |
|---|---|
| **首页 Home** | 横向 bento：实时**时钟·日期**（日期胶囊 + 琥珀分钟、每秒跳秒）／**快捷应用**（与应用 Tab 收藏同源，点击启动）／**速记**（随手记，输入即存）／**镜子**（圆形摄像头预览，点按才开） |
| **待办 Todo** | P0–P3 **四列并排**（Eisenhower Matrix），勾选 / 删除 / 计数；新增走**连按两次回车**确认（防误触） |
| **应用 Apps** | 本机**应用启动坞**：列出 `/Applications` 原生图标，**搜索**实时过滤，**收藏**置顶到「常用」，**拖拽自定义排序**（持久化），点击真实启动 |

---

## 关键设计

- 展开尺寸**按 Tab 取值**：首页 980×196 / 待办 1080×300 / 应用 1120×540（panelHeight，外加刘海条高与上下 padding）；折叠刘海 **200 ×（菜单栏高 + 18px 唇边）**
- 纯单色玻璃材质：黑底 + 发丝边框 `rgba(255,255,255,0.08)` + 顶部 1px 高光
- 强调色仅两类例外：待办 P0 红 / P1 橙 / P2 黄 / P3 绿，以及 app 原生彩色图标
- 缓动 `cubic-bezier(0.32, 0.72, 0, 1)`，展开 320ms、Tab 切换交叉淡入
- 完整设计规格见 [`docs/DASHBOARD-DESIGN.md`](docs/DASHBOARD-DESIGN.md)（唯一取值依据）

---

## 数据存储

数据持久化在浏览器 LocalStorage（位于 `~/Library/Application Support/notch-todo/Local Storage/`），关机重启不丢：

| Key | 内容 |
|---|---|
| `notch-todo-data` | 四象限待办 `{P0,P1,P2,P3}`，item `{id,text,done,createdAt}` |
| `notch-home-note` | 首页速记纯文本 |
| `notch-app-favorites` | 应用收藏 `[appPath, ...]`（首页快捷应用与应用 Tab「常用」同源） |
| `notch-app-order` | 「全部应用」拖拽自定义顺序 `[appPath, ...]` |
| `notch-active-tab` | 上次所在 Tab：`'home' | 'todo' | 'apps'` |

---

## 隐私

- **镜子摄像头默认不开**：首页镜子 tile 显示占位圆，点按才 `getUserMedia` 激活
- **离开即释放**：切走首页 Tab、收起面板或再次点击，立即 `track.stop()` 释放摄像头
- 所有数据仅存本机 LocalStorage，无云端、无网络上传

---

## 命令

```bash
npm install   # 安装依赖
npm start     # 启动开发（改完 main.js / renderer/* 直接看效果，无构建步骤）
npm run build # 打包 .dmg（electron-builder）
```

> 安装、Gatekeeper 首次打开、签名与打包细节见下文「从源码构建」。

---

## 安装（普通用户）

> 仅支持 macOS Apple Silicon (M1/M2/M3/M4)，系统要求 macOS 11+。Intel Mac 请走「从源码构建」。

1. 从 [Releases](https://github.com/chusimin/notch-todo/releases) 下载最新 `NotchTodo-x.y.z-arm64.dmg`
2. 双击 dmg → 把 `NotchTodo.app` 拖进 `Applications`
3. 首次打开被 Gatekeeper 拦截时，任选其一：
   - **右键打开**：Finder → 应用程序里 **Control 点击**（或右键）`NotchTodo` → 选「打开」→ 再点「打开」确认
   - **终端一行**：`xattr -cr /Applications/NotchTodo.app`

装好后屏幕顶部正中出现黑色刘海条，menu bar 出现小刘海图标，默认已注册系统登录项（开机自启，可在右键菜单切换）。

---

## 使用方法

| 操作 | 效果 |
|---|---|
| 点击刘海唇边（菜单栏下方露出的一段） | 从刘海垂下展开仪表盘 |
| 再点唇边，或点面板外任意处 | 收起回刘海形态（失焦自动收起） |
| 顶部分段控件 | 切换 首页 / 待办 / 应用，记住上次所在 Tab |
| 待办输入框内**连按两次回车** | 新增一条：第一次回车浮出「再按一次回车提交」提示，第二次才真正提交（防误触）；中途继续打字或失焦会重置 |
| 点圆形勾选框 | 标记完成 / 取消完成 |
| 鼠标移到待办上 → 点 × | 删除该条 |
| 首页镜子圆点击 | 打开摄像头预览；离开首页或再次点击释放 |
| 应用搜索框输入 / 点击图标 | 实时过滤本机应用 / 真实启动 |
| 点 menu bar 小刘海图标 | 弹菜单：显示/隐藏、重新居中、开机自启切换、关于、退出 |

---

## 从源码构建（开发者）

```bash
git clone https://github.com/chusimin/notch-todo.git
cd notch-todo
npm install
npm start
```

代码无构建步骤，改完 `main.js` / `renderer/*` 后 `npm start` 直接看效果。

### 打包 .dmg

```bash
npm run build
```

产物：`dist/NotchTodo-x.y.z-arm64.dmg`。构建关键点：

- `asar: false` — 关闭 Asar Integrity 校验，避免重签后 hash 不一致
- `mac.identity: null` + `afterPack` 钩子 — electron-builder 跳过签名后，由 [`build/afterPack.js`](build/afterPack.js) 用 `codesign --sign -` 按「内→外」顺序对整个 bundle 做 ad-hoc 重签
- `extendInfo` 注入 `NSCameraUsageDescription`（镜子摄像头授权说明）；不覆盖 `CFBundleName`，否则启动期会按错名字找 Helper bundle 直接 trap

### 启用真签名（消除 Gatekeeper 警告）

1. 在 Apple Developer 后台办 "Developer ID Application" 证书并导入钥匙串
2. 编辑 `package.json`：把 `"identity": null` 改成你的证书名（如 `"Developer ID Application: Your Name (TEAMID)"`）
3. （可选）启用 hardened runtime + notarization，[`build/entitlements.mac.plist`](build/entitlements.mac.plist) 已预留 JIT 与摄像头 entitlements

---

## 项目结构

```
.
├── main.js                       # 主进程：窗口、Tray、多屏适配、自启、应用列举 IPC
├── preload.js                    # contextBridge 安全桥接（listApps / launchApp / openExternal …）
├── renderer/
│   ├── index.html                # 3-Tab DOM（首页 / 待办 / 应用）
│   ├── styles.css                # 纯单色玻璃样式 + 设计 token
│   └── app.js                    # LocalStorage 持久化 + 三 Tab 交互
├── docs/
│   └── DASHBOARD-DESIGN.md        # 仪表盘设计规格（唯一取值依据）
├── build/
│   ├── afterPack.js              # electron-builder afterPack：递归 ad-hoc 签名
│   └── entitlements.mac.plist    # 预留 entitlements（摄像头 / JIT）
├── package.json                  # 依赖 + electron-builder 配置
├── CLAUDE.md                     # 项目规范（vibe coding harness）
└── dist/                         # 打包产物（已 .gitignore）
```

---

## 技术栈

- **Electron 33** — 桌面 shell
- **原生 HTML/CSS/JS** — 无构建步骤、无框架、无前端依赖
- **LocalStorage** — 本机数据持久化，无后端
- **electron-builder 25** — 打包到 .dmg

---

## 已知问题 / Roadmap

- [ ] Intel x64 包：electron-builder 在路径含中文时打包失败，需要把项目复制到纯英文路径再构建
- [ ] Windows / Linux 支持：当前完全 macOS 专属（依赖 `screen-saver` window level、`app.dock.hide()`、`app.getFileIcon` 等 macOS API）
- [ ] iCloud 同步：目前数据只在本机 LocalStorage，跨设备不同步
- [ ] 自动更新：需配置 GitHub Release + `electron-updater`

欢迎 Issue / PR。

---

## License

MIT
