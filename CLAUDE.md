# 桌面刘海屏待办

一个常驻在 macOS 屏幕顶部刘海位置的纯单色玻璃**仪表盘**：默认折叠成刘海大小，点击从刘海垂下展开，含**首页 / 待办 / 应用**三个 Tab —— 首页（时钟·日期 / 速记 / 快捷链接 / 镜子摄像头）、待办（P0/P1/P2/P3 四象限勾选式待办）、应用（本机应用启动坞）。

## 技术栈

- 框架：Electron（无 React/Vue，直接 HTML/CSS/JS）
- 样式：原生 CSS（贴近 Apple 风格的玻璃质感 + 圆角）
- 语言：JavaScript（无构建步骤）
- 后端：无（数据存 LocalStorage）
- 包管理器：npm
- Node 版本：>=18

## 命令

- 启动开发：`npm start`
- 安装依赖：`npm install`
- 打包发布：`npm run build`（后续接入 electron-builder）

## 目录结构

```
桌面刘海屏待办/
  package.json       # Electron 依赖 + 启动脚本
  main.js            # 主进程：窗口创建、定位、置顶、IPC、应用列举
  preload.js         # 安全桥接 contextBridge
  renderer/
    index.html       # 渲染入口（3-Tab DOM）
    styles.css       # 刘海 + 仪表盘玻璃样式
    app.js           # 三 Tab 交互逻辑 + LocalStorage 持久化
  docs/
    DASHBOARD-DESIGN.md  # 仪表盘设计规格（渲染层唯一取值依据）
```

## 关键设计参数

- 刘海尺寸：宽 200px，高 = 菜单栏高度 + 10px 唇边（最小 38px，主进程按屏计算）—— macOS 菜单栏/物理刘海会拦截其高度带内的点击，刘海必须在菜单栏下方露出唇边才可见、可点；唇边压到 10px 让黑条尽量贴近物理刘海
- 展开尺寸：按 Tab 取值 —— 首页 980 / 待办 1080 / 应用 1120 宽，窗口总高 = 菜单栏高(顶部透明占位，菜单栏透出) + EXPANDED_CHROME_Y(80) + panelHeight(196/300/540)；宽度超屏 clamp 到工作区-24
- 展开态布局：黑条退场、菜单栏透出，玻璃面板悬挂菜单栏下方（全圆角）；顶栏单行 = [brand][tabs][弹性中段：应用 Tab 的搜索框][收起钮]
- 窗口变形（防卡顿铁律）：**主进程 setBounds 一律瞬时、禁用系统动画**（NSWindow 动画 resize 持续重绘 web 内容必卡）；平滑感全在渲染层 CSS —— 展开 = 先瞬时放大窗口再播面板入场；收起 = 先播退场再瞬时缩窗；切 Tab = morphToTab 锁定面板 px → 过渡到目标 px（放大先变窗、缩小后变窗，补间永远发生在窗口足够大的一侧）
- 多屏锚定：模式切换 / Tab 变形 / 失焦收起一律锚定**窗口当前所在屏**（getDisplayMatching），绝不跟随光标——否则失焦瞬间刘海会瞬移到光标所在的另一块屏；仅启动 / 托盘重新居中 / 显示跟随光标屏
- 展开/收起交互：折叠态点唇边展开；收起 = 顶栏中段空白点按（只认 .topbar-mid 本体，控件缝隙不响应防误触）/ 收起钮 / 点面板外任意处（窗口失焦）自动收起 / Esc（主进程 before-input-event 转发兜底，Escape 不会原生到达页面）
- 三 Tab 结构：首页（横向 bento：时钟·日期 / 快捷应用[与收藏同源] / 速记 / 镜子摄像头）+ 待办（P0–P3 四列并排）+ 应用（本机应用启动坞，搜索 / 收藏 / 点击启动 / 拖拽排序 notch-app-order）；左上分段控件切换，激活胶囊滑动 + 内容交叉淡入，记住上次所在 Tab
- 配色：纯单色玻璃 —— 纯黑底 #000000、白色分级文本，强调色仅 P0–P3 色点（P0 红 / P1 橙 / P2 黄 / P3 绿）与 app 原生图标
- 圆角：折叠态下方两角 14px、展开态全圆角 16px
- 动效：transform / opacity / width / height 过渡，--ease = cubic-bezier(0.32, 0.72, 0, 1)，入场 240ms / 退场 170ms / 变形补间 200ms；窗口本身零动画
- 提交方式：输入框内**连按两次回车**确认新增 —— 第一次回车进入待确认（armed）并浮出「再按一次回车提交」提示，第二次才提交；中途继续输入或失焦会重置，输入法组合态（isComposing）忽略。意在防误触

## 代码规范

- 主进程文件 camelCase，常量大写下划线
- 所有渲染逻辑写在 renderer/ 下，与主进程隔离
- 通过 contextBridge 暴露 IPC，禁止 nodeIntegration
- 样式使用 CSS 自定义属性（var(--xxx)）集中管理 token

## NEVER

- NEVER 在渲染进程直接 require('electron')，必须走 preload
- NEVER 让窗口可被拖动出刘海位置，每次显示都强制贴顶居中
- NEVER 硬编码颜色/字号/间距，必须使用 CSS 变量
- NEVER 提交 node_modules / dist
- NEVER 在没有用户确认的情况下打包发布
- NEVER 让摄像头常驻：非首页/收起即释放 track

## 压缩指令

当执行 /compact 时，必须保留：
- 当前正在调整的窗口行为或样式细节
- LocalStorage 数据结构（任务模型）
- 已知 macOS 适配问题
