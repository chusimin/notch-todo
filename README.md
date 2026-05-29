# 刘海待办 NotchTodo

> 一个常驻 macOS 屏幕顶部刘海位置的轻量待办工具。点击刘海展开，再次点击收起。
> 4 个优先级象限（P0 / P1 / P2 / P3）按 Eisenhower Matrix 组织你今天要做的事。

![平台](https://img.shields.io/badge/platform-macOS-blue?style=flat-square)
![架构](https://img.shields.io/badge/arch-Apple%20Silicon-orange?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![无依赖](https://img.shields.io/badge/runtime-Electron%2033-9cf?style=flat-square)

---

## 它长什么样

```
       折叠态                            展开态
   ┌──────────┐               ┌────────────────────────────┐
   │   刘海   │   ──点击──>   │  ┌──────────┬──────────┐  │
   └──────────┘               │  │ P0 红    │ P1 橙    │  │
       ↑                      │  │ 紧急重要 │ 重要不急 │  │
   200×32 px                  │  ├──────────┼──────────┤  │
   贴顶居中                    │  │ P2 黄    │ P3 绿    │  │
                              │  │ 急不重要 │ 日常     │  │
                              │  └──────────┴──────────┘  │
                              └────────────────────────────┘
                                       560×420 px
```

- 纯黑底 + Apple 系统色徽章，菜单栏小图标用 template image 自动深浅色适配
- 跟随鼠标所在屏定位，接外接屏自动跳到当前看的那块屏顶
- 数据持久化到本地 LocalStorage，关机重启不丢

---

## 安装（普通用户）

> 仅支持 macOS Apple Silicon (M1/M2/M3/M4)。
> 系统要求 macOS 11+。Intel Mac 请走「从源码构建」章节。

### 一、下载

从 [Releases](https://github.com/chusimin/notch-todo/releases) 下载最新 `NotchTodo-x.y.z-arm64.dmg`。

### 二、安装

双击 dmg → 把 `NotchTodo.app` 拖进 `Applications` 文件夹。

### 三、首次打开

因为本应用没有 Apple Developer 付费签名，第一次打开时 macOS Gatekeeper 会拦截。任选其一：

**方法 A：右键打开（推荐）**
1. 在 Finder → 应用程序 中找到 `NotchTodo`
2. **按住 Control 键点击**它（或右键）→ 选 **"打开"**
3. 弹窗里再次点 **"打开"** 确认

第二次起双击即可。

**方法 B：终端命令一行解决**

```bash
xattr -cr /Applications/NotchTodo.app
```

之后双击直接开。

### 四、装好之后

- 屏幕顶部正中央会出现一条黑色刘海条
- menu bar 右上区域会出现一个小刘海图标（自动适配深/浅色）
- 默认已经注册到 **系统登录项**（开机自启），可在 menu bar 图标右键菜单里切换

---

## 使用方法

| 操作 | 效果 |
|---|---|
| 点击刘海 | 展开成 2×2 优先级待办卡片 |
| 再次点击顶部刘海条 | 收起回刘海形态 |
| 输入框内回车 | 在对应优先级新增一条 |
| 点圆形勾选框 | 标记完成 / 取消完成 |
| 鼠标移到待办上 → 点 × | 删除该条 |
| 点 menu bar 小刘海图标 | 弹菜单：显示/隐藏、重新居中、开机自启切换、关于、退出 |

数据保存在：`~/Library/Application Support/notch-todo/Local Storage/`

---

## 设计哲学

| 维度 | 选择 | 理由 |
|---|---|---|
| **形态** | 仿物理刘海（200×32），贴屏幕物理顶端 y=0 | 在视觉上"无痕"融入硬件刘海，不抢界面焦点 |
| **优先级** | P0 红 / P1 橙 / P2 黄 / P3 绿 | 沿用 Apple 系统色（systemRed / Orange / Yellow / Green），冷暖平衡 |
| **布局** | 2×2 网格（Eisenhower Matrix） | 比上下堆叠更直观地表达"紧急程度 × 重要程度"二维 |
| **字号** | 10–14px | macOS 桌面小工具气质，与 menu bar 自身字号一致 |
| **缓动** | `cubic-bezier(0.32, 0.72, 0, 1)` | iOS 原生 spring 感的近似，280ms duration |
| **托盘图标** | 程序化生成 32×32 @2x PNG | 形态与产品一致（扁平顶 + 圆角底），4×4 超采样抗锯齿，setTemplateImage 自动深浅色 |

---

## 从源码构建（开发者）

### 开发模式

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

产物：`dist/NotchTodo-x.y.z-arm64.dmg`。

构建流程关键点：

- `asar: false` — 关闭 Asar Integrity 校验，避免重签后 hash 不一致
- `mac.identity: null` + `afterPack` 钩子 — electron-builder 跳过签名后，由 [`build/afterPack.js`](build/afterPack.js) 用 `codesign --sign -` 按"内→外"顺序对整个 bundle 做 ad-hoc 重签
- `extendInfo` 不覆盖 `CFBundleName` — 否则 Electron 启动期会按错的名字找 Helper bundle 直接 trap

### 启用真签名（消除 Gatekeeper 警告）

如果想让收件人双击直接打开、无任何提示：

1. 在 Apple Developer 后台办 "Developer ID Application" 证书
2. 下载并双击导入到钥匙串
3. 编辑 `package.json`：把 `"identity": null` 改成你的证书名（如 `"Developer ID Application: Your Name (TEAMID)"`）
4. （可选）启用 hardened runtime 和 notarization，配置 entitlements

注：[`build/entitlements.mac.plist`](build/entitlements.mac.plist) 已经预留好 JIT 等 entitlements，启用 hardenedRuntime 时直接生效。

---

## 项目结构

```
.
├── main.js                       # 主进程：窗口、Tray、多屏适配、自启
├── preload.js                    # contextBridge 安全桥接
├── renderer/
│   ├── index.html                # 2×2 网格 DOM
│   ├── styles.css                # Apple 风样式 + 设计 token
│   └── app.js                    # LocalStorage 持久化 + 交互
├── build/
│   ├── afterPack.js              # electron-builder afterPack：递归 ad-hoc 签名
│   └── entitlements.mac.plist    # 预留 entitlements（未来接真证书用）
├── package.json                  # 依赖 + electron-builder 配置
├── CLAUDE.md                     # 项目规范（vibe coding harness）
└── dist/                         # 打包产物（已 .gitignore）
```

---

## 技术栈

- **Electron 33** — 桌面 shell
- **原生 HTML/CSS/JS** — 无构建步骤、无框架
- **electron-builder 25** — 打包到 .dmg

整个项目 6 个源文件，主进程 ~400 行、渲染层 ~600 行，零运行时依赖（除 Electron 自身）。

---

## 已知问题 / Roadmap

- [ ] Intel x64 包：electron-builder 在路径含中文时打包失败，需要把项目复制到纯英文路径再构建
- [ ] Windows / Linux 支持：当前完全 macOS 专属（依赖 `screen-saver` window level、`app.dock.hide()` 等 macOS API）
- [ ] iCloud 同步：目前数据只在本机 LocalStorage，跨设备不同步
- [ ] 自动更新：需配置 GitHub Release + `electron-updater`

欢迎 Issue / PR。

---

## License

MIT
