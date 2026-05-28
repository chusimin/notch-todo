# 刘海待办 NotchTodo

> 常驻 macOS 屏幕顶部刘海位置的优先级待办工具。点击刘海展开，再次点击收起。
> 4 个优先级象限（P0/P1/P2/P3）按 Eisenhower Matrix 组织你的事项。

---

## 给使用者：安装与使用

### 系统要求

- macOS 10.12 及以上
- Apple Silicon（M1/M2/M3/M4）芯片

> Intel Mac 暂未提供预编译包，可按下方"从源码构建"自行打包。

### 安装步骤

1. 下载 `NotchTodo-0.1.0-arm64.dmg`
2. 双击打开 dmg，把 **NotchTodo.app** 拖入 **Applications** 文件夹
3. 在 Launchpad 或 Applications 中找到 NotchTodo，**右键 → 打开**

### 首次打开提示「无法验证开发者」？

这是因为本应用没有付费 Apple Developer 签名。绕过方法（任选其一）：

**方法 A（推荐）：右键打开**

1. 在 Finder/Applications 中找到 NotchTodo
2. **按住 Control 键点击**（或右键）→ 选择 **"打开"**
3. 弹窗中再次点击 **"打开"** 确认

**方法 B：系统设置**

1. 双击应用，看到"无法验证开发者"提示
2. 打开 **系统设置 → 隐私与安全性**
3. 滚动到底部，找到 NotchTodo 被阻止的提示
4. 点击 **"仍要打开"**

**方法 C：终端**

```bash
xattr -d com.apple.quarantine /Applications/NotchTodo.app
```

之后双击即可直接打开，不再有警告。

### 使用方法

| 操作                 | 效果                                                 |
| -------------------- | ---------------------------------------------------- |
| 启动应用             | 屏幕顶部中央出现一条黑色刘海，menu bar 多了 📝 图标 |
| 点击刘海             | 展开成 4 象限待办卡片                                |
| 再次点击顶部黑色条带 | 收起为刘海形态                                       |
| 输入框 + Enter       | 在对应优先级新增待办                                 |
| 点击圆形勾选框       | 标记完成 / 取消完成                                  |
| 鼠标移上 × 按钮      | 删除待办                                             |
| 点击 menu bar 📝     | 弹出菜单：显示/隐藏刘海、重新居中、关于、退出        |

### 退出应用

点击 menu bar 上的 📝 图标 → 选择 **退出**（或 `⌘Q`）。

### 数据保存在哪？

待办数据存在浏览器 LocalStorage 中，物理路径：

```
~/Library/Application Support/NotchTodo/Local Storage/leveldb/
```

应用卸载时这个目录不会自动删除，可手动清理。

---

## 给开发者：从源码构建

### 开发模式

```bash
git clone <repo-url>
cd 桌面刘海屏待办
npm install
npm start
```

### 打包 .dmg

```bash
# 未签名（个人项目，接收者需绕过 Gatekeeper）
npm run build:unsigned

# 已签名（需 Apple Developer 证书在钥匙串中）
npm run build
```

产物在 `dist/` 目录。

### Intel x64 构建

⚠️ 当项目路径包含非 ASCII 字符（中文/日文等）时，electron-builder 的 x64 包过程有 bug。
解决方法：

```bash
# 把项目复制到纯英文路径
cp -r 桌面刘海屏待办 ~/notch-todo-build
cd ~/notch-todo-build
npx electron-builder --mac dmg --x64 -c.mac.identity=null
```

### 启用代码签名（消除 Gatekeeper 警告）

1. 在 Apple Developer 后台创建 "Developer ID Application" 证书
2. 下载并双击安装到钥匙串
3. 编辑 `package.json` 删除 `mac.identity: null`（或保留默认让 electron-builder 自动检测）
4. 运行 `npm run build`

如需公证（notarization），还要配置 Apple ID app-specific password。详见
[electron-builder 文档](https://www.electron.build/code-signing)。

---

## 项目结构

```
.
├── main.js              # 主进程：窗口定位、Tray 托盘、IPC
├── preload.js           # contextBridge 安全桥接
├── renderer/
│   ├── index.html       # 4 象限 DOM 结构
│   ├── styles.css       # Apple 风样式 + 动画 token
│   └── app.js           # LocalStorage 持久化 + 交互
├── package.json         # 依赖 + electron-builder 配置
├── CLAUDE.md            # 项目规范（vibe coding）
└── dist/                # 打包产物（.gitignore）
```

## 技术栈

- Electron 33
- 原生 HTML/CSS/JS（无构建步骤）
- electron-builder 25（打包）

## License

MIT
