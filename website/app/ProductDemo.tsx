"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import "./ProductDemo.css";

const DEMO_TABS = [
  { id: "home", label: "首页" },
  { id: "todo", label: "待办" },
  { id: "clip", label: "剪贴板" },
  { id: "apps", label: "应用" },
] as const;

type DemoTab = (typeof DEMO_TABS)[number]["id"];

function TabIcon({ tab }: { tab: DemoTab }) {
  if (tab === "home") {
    return (
      <svg className="pd-tab-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 11.5 12 4l8 7.5" /><path d="M6 10v9h12v-9" />
      </svg>
    );
  }
  if (tab === "todo") {
    return (
      <svg className="pd-tab-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h10M4 12h10M4 17h7M17.5 7.5 19 9l2.5-3" />
      </svg>
    );
  }
  if (tab === "clip") {
    return (
      <svg className="pd-tab-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
      </svg>
    );
  }
  return (
    <svg className="pd-tab-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="6.5" height="6.5" rx="2" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="2" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="2" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2" />
    </svg>
  );
}

const TODO_GROUPS = [
  {
    id: "P0",
    label: "紧急 · 重要",
    color: "red",
    items: [
      ["确认发布版本", true],
      ["检查安装包", false],
    ],
  },
  {
    id: "P1",
    label: "重要 · 不紧急",
    color: "orange",
    items: [
      ["完善新手说明", false],
      ["整理体验反馈", false],
    ],
  },
  {
    id: "P2",
    label: "紧急 · 不重要",
    color: "green",
    items: [
      ["回复测试消息", false],
      ["核对演示内容", true],
    ],
  },
  {
    id: "P3",
    label: "日常 · 待办",
    color: "blue",
    items: [
      ["清理演示截图", false],
      ["归档旧文档", false],
    ],
  },
] as const;

const APPS = [
  ["✦", "Safari", "safari", "blue"],
  [">_", "终端", "terminal", "graphite"],
  ["≡", "备忘录", "notes", "yellow"],
  ["●", "Figma", "figma", "rose"],
  ["6", "日历", "calendar", "red"],
  ["✉", "邮件", "mail", "sky"],
  ["⌁", "预览", "preview", "indigo"],
  ["⌁", "活动监视器", "activity", "green"],
  ["◇", "快捷指令", "shortcuts", "violet"],
  ["A", "文本编辑", "textedit", "silver"],
  ["♪", "音乐", "music", "rose"],
  ["✣", "照片", "photos", "silver"],
  ["•••", "信息", "messages", "green"],
  ["⚙", "系统设置", "settings", "graphite"],
  ["＋", "计算器", "calculator", "orange"],
  ["◒", "访达", "finder", "blue"],
  ["X", "Xcode", "preview", "blue"],
  ["⌘", "脚本编辑器", "shortcuts", "violet"],
  ["✓", "提醒事项", "notes", "yellow"],
  ["◉", "地图", "safari", "green"],
  ["B", "图书", "notes", "orange"],
  ["P", "播客", "music", "violet"],
  ["◫", "FaceTime", "messages", "green"],
  ["◷", "时钟", "settings", "graphite"],
  ["∿", "语音备忘录", "activity", "red"],
  ["N", "Numbers", "activity", "green"],
  ["P", "Pages", "textedit", "orange"],
  ["K", "Keynote", "preview", "blue"],
  ["<> ", "VS Code", "terminal", "blue"],
  ["D", "Discord", "shortcuts", "violet"],
  ["S", "Slack", "figma", "rose"],
  ["◎", "Chrome", "safari", "red"],
  ["A", "Arc", "terminal", "silver"],
  ["Z", "Zoom", "preview", "blue"],
  ["O", "Obsidian", "shortcuts", "violet"],
  ["R", "Raycast", "terminal", "rose"],
  ["C", "Cursor", "terminal", "silver"],
  ["G", "GitHub", "terminal", "graphite"],
  ["T", "Things", "notes", "blue"],
  ["I", "iA Writer", "textedit", "silver"],
  ["L", "Linear", "shortcuts", "indigo"],
  ["F", "Firefox", "safari", "orange"],
  ["V", "VLC", "calculator", "orange"],
  ["M", "Mimestream", "mail", "sky"],
  ["P", "Pixelmator", "photos", "rose"],
  ["C", "CleanShot", "preview", "indigo"],
  ["D", "Docker", "finder", "blue"],
  ["H", "Home", "messages", "green"],
] as const;

function HomePanel() {
  const [mirrorOn, setMirrorOn] = useState(false);
  const [openedApp, setOpenedApp] = useState<string | null>(null);

  return (
    <div className="pd-home-grid">
      <section className="pd-tile pd-home-clock">
        <span className="pd-clock-date">8 月 6 日 · 星期四</span>
        <div className="pd-clock-time"><strong>09:<em>41</em></strong><small>26</small></div>
      </section>

      <button
        className={`pd-tile pd-home-mirror${mirrorOn ? " is-on" : ""}`}
        type="button"
        aria-pressed={mirrorOn}
        onClick={() => setMirrorOn((value) => !value)}
      >
        <div className={`pd-mirror-stage${mirrorOn ? " is-live" : ""}`}>
          {mirrorOn ? (
            <span className="pd-mirror-person" aria-hidden="true"><i /><b /></span>
          ) : (
            <span className="pd-camera-glyph"><i /></span>
          )}
          <strong>{mirrorOn ? "镜子已开启" : "镜子"}</strong>
          <small>{mirrorOn ? "再次点按关闭" : "点按开启"}</small>
        </div>
      </button>

      <section className="pd-tile pd-home-quick">
        <div className="pd-tile-header"><span>快捷应用</span><b>＋</b></div>
        <div className="pd-quick-grid">
          {APPS.slice(0, 6).map(([glyph, name, icon, tone]) => (
            <button
              className={`pd-quick-app${openedApp === name ? " is-launched" : ""}`}
              type="button"
              aria-label={`模拟打开 ${name}`}
              onClick={() => setOpenedApp(name)}
              key={name}
            >
              <span className={`pd-app-icon pd-icon-${icon} pd-tone-${tone}`}>{glyph}</span>
              <small>{openedApp === name ? "已打开" : name}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="pd-tile pd-home-note">
        <div className="pd-note-tools" aria-hidden="true">
          <span>H</span><span><b>B</b></span><span><i>I</i></span><span>•</span><span>1.</span><span>✓</span><span>”</span><span>&lt;&gt;</span>
          <div><span>编辑</span><b>预览</b></div>
        </div>
        <div className="pd-note-copy">
          <strong># 今天</strong>
          <p><span>✓</span><s>整理首页文案</s></p>
          <p><span />检查下载流程</p>
          <p><span />回复体验反馈</p>
          <blockquote>先把最重要的一件事做完。</blockquote>
        </div>
      </section>

      <section className="pd-tile pd-home-favorites">
        <div className="pd-tile-header"><span>收藏剪贴</span><small>3</small></div>
        <div className="pd-favorite-clips">
          <p>今天先完成最重要的一件事。</p>
          <p>github.com/chusimin/notch-todo</p>
          <p>npm run build</p>
        </div>
      </section>
    </div>
  );
}

function TodoPanel() {
  const [completed, setCompleted] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      TODO_GROUPS.flatMap((group) =>
        group.items.map(([text, done]) => [`${group.id}:${text}`, done]),
      ),
    ),
  );

  const toggleTask = (key: string) => {
    setCompleted((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <div className="pd-todo-grid">
      {TODO_GROUPS.map((group) => {
        const remaining = group.items.filter(([text]) => !completed[`${group.id}:${text}`]).length;
        return (
          <section className={`pd-tile pd-todo-group pd-group-${group.color}`} key={group.id}>
            <header>
              <i className={`pd-priority-dot pd-dot-${group.color}`} />
              <strong>{group.id}</strong>
              <span>{group.label}</span>
              <small>{remaining}</small>
            </header>
            <div className="pd-tasks">
              {group.items.map(([text]) => {
                const taskKey = `${group.id}:${text}`;
                const done = completed[taskKey];
                return (
                  <button
                    className={done ? "pd-task is-done" : "pd-task"}
                    type="button"
                    aria-pressed={done}
                    onClick={() => toggleTask(taskKey)}
                    key={text}
                  >
                    <i>{done ? "✓" : ""}</i><span>{text}</span>
                  </button>
                );
              })}
            </div>
            <div className="pd-add-task">添加 {group.id} 待办，回车保存…</div>
          </section>
        );
      })}
    </div>
  );
}

function ClipPanel() {
  const [filter, setFilter] = useState<"all" | "text" | "image" | "favorite">("all");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const clips = [
    { kind: "text", content: "今天先完成最重要的一件事。", time: "刚刚", favorite: false },
    { kind: "url", content: "github.com/chusimin/notch-todo", time: "3 分钟前", favorite: true },
    { kind: "image", content: "", time: "12 分钟前", favorite: false },
    { kind: "text", content: "npm run build", time: "18 分钟前", favorite: false, code: true },
    { kind: "text", content: "发布前检查：功能、隐私、安装说明。", time: "26 分钟前", favorite: true },
    { kind: "text", content: "下一步：确认下载按钮和版本说明。", time: "1 小时前", favorite: false },
    { kind: "url", content: "developer.apple.com/design", time: "2 小时前", favorite: false },
    { kind: "image", content: "", time: "8/6", favorite: true },
  ];
  const filters = [
    ["all", "全部"],
    ["text", "文字"],
    ["image", "图片"],
    ["favorite", "收藏"],
  ] as const;
  const visibleClips = clips
    .map((clip, index) => ({ clip, index }))
    .filter(({ clip }) => {
      if (filter === "text") return clip.kind !== "image";
      if (filter === "image") return clip.kind === "image";
      if (filter === "favorite") return clip.favorite;
      return true;
    });

  return (
    <div className="pd-clip-panel">
      <div className="pd-clip-toolbar">
        {filters.map(([value, label]) => (
          <button
            className={filter === value ? "is-active" : ""}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            key={value}
          >
            {label}
          </button>
        ))}
        <button
          className="pd-clip-clear"
          type="button"
          aria-label="重置剪贴板演示"
          onClick={() => { setFilter("all"); setCopiedIndex(null); }}
        >⌫</button>
      </div>
      <div className="pd-clip-grid">
        {visibleClips.map(({ clip, index }) => (
          <article
            className={`pd-clip-card pd-clip-${clip.kind}${copiedIndex === index ? " is-copied" : ""}`}
            key={`${clip.time}-${index}`}
          >
            <button
              className="pd-clip-hit"
              type="button"
              aria-label={clip.kind === "image" ? `复制 ${clip.time} 的图片` : `复制：${clip.content}`}
              onClick={() => setCopiedIndex(index)}
            />
            {clip.kind === "image" ? (
              <div className={`pd-clip-art pd-art-${index}`} aria-label="脱敏图片缩略图"><span /></div>
            ) : (
              <p className={clip.code ? "is-code" : ""}>{clip.content}</p>
            )}
            <footer>
              <time>{clip.time}</time>
              <span aria-live="polite">{copiedIndex === index ? "已复制" : clip.favorite ? "★" : ""}</span>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}

function AppsPanel({ query }: { query: string }) {
  const [launchedApp, setLaunchedApp] = useState<string | null>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleApps = APPS.filter(([, name]) =>
    name.toLocaleLowerCase().includes(normalizedQuery),
  );

  const appButton = (
    [glyph, name, icon, tone]: (typeof APPS)[number],
    favorite: boolean,
  ) => (
    <button
      className={`pd-app-cell${launchedApp === name ? " is-launched" : ""}`}
      type="button"
      aria-label={`模拟打开 ${name}`}
      onClick={() => setLaunchedApp(name)}
      key={name}
    >
      <span className={`pd-app-icon pd-icon-${icon} pd-tone-${tone}`}>{glyph}</span>
      <small>{name}</small>{favorite && <i>★</i>}
    </button>
  );

  return (
    <div className="pd-apps-layout">
      <section className="pd-tile pd-apps-favorites">
        <header><span>常用</span><small>{APPS.slice(0, 4).length}</small></header>
        <div className="pd-favorite-app-grid">
          {APPS.slice(0, 4).map((app) => appButton(app, true))}
        </div>
      </section>
      <section className="pd-app-library">
        <header>
          <span>全部应用</span>
          <small aria-live="polite" aria-atomic="true">{visibleApps.length} 个应用</small>
        </header>
        {launchedApp && <span className="pd-app-launch-toast" role="status">✓ 已模拟打开 {launchedApp}</span>}
        <div className="pd-all-app-grid">
          {visibleApps.map((app) => appButton(app, APPS.slice(0, 4).includes(app)))}
          {visibleApps.length === 0 && <p className="pd-app-empty">没有匹配的应用</p>}
        </div>
      </section>
    </div>
  );
}

function PanelContent({ tab, appQuery }: { tab: DemoTab; appQuery: string }) {
  if (tab === "todo") return <TodoPanel />;
  if (tab === "clip") return <ClipPanel />;
  if (tab === "apps") return <AppsPanel query={appQuery} />;
  return <HomePanel />;
}

export default function ProductDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const tabListRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeTabRef = useRef<DemoTab>("home");
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idBase = useId().replaceAll(":", "");

  const [activeTab, setActiveTab] = useState<DemoTab>("home");
  const [cursorTab, setCursorTab] = useState<DemoTab>("home");
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorPressing, setCursorPressing] = useState(false);
  const [manualPause, setManualPause] = useState(false);
  const [pointerHeld, setPointerHeld] = useState(false);
  const [focusHeld, setFocusHeld] = useState(false);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const [isInView, setIsInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [appQuery, setAppQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [indicatorGeometry, setIndicatorGeometry] = useState({ left: 0, width: 0 });
  const interactionHeld = pointerHeld || focusHeld;

  const selectTab = useCallback((tab: DemoTab) => {
    activeTabRef.current = tab;
    setActiveTab(tab);
  }, []);

  const pauseAutoplay = useCallback(() => {
    setManualPause(true);
    setCursorVisible(false);
    setCursorPressing(false);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      setManualPause(false);
      resumeTimerRef.current = null;
    }, 8000);
  }, []);

  const chooseTab = useCallback((tab: DemoTab) => {
    pauseAutoplay();
    selectTab(tab);
  }, [pauseAutoplay, selectTab]);

  const moveCursorToTab = useCallback((tab: DemoTab) => {
    const screen = screenRef.current;
    const index = DEMO_TABS.findIndex((item) => item.id === tab);
    const target = tabRefs.current[index];
    if (!screen || !target) return;

    const screenRect = screen.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    setCursorPosition({
      x: targetRect.left - screenRect.left + targetRect.width * 0.48,
      y: targetRect.top - screenRect.top + targetRect.height * 0.56,
    });
  }, []);

  const updateIndicator = useCallback((tab: DemoTab) => {
    const index = DEMO_TABS.findIndex((item) => item.id === tab);
    const target = tabRefs.current[index];
    if (!target) return;
    setIndicatorGeometry({ left: target.offsetLeft, width: target.offsetWidth });
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") {
      setIsInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting && entry.intersectionRatio >= 0.18;
        setIsInView(visible);
        if (!visible) {
          setCursorVisible(false);
          setCursorPressing(false);
        }
      },
      { threshold: [0, 0.18, 0.45] },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateVisibility = () => {
      const visible = document.visibilityState === "visible";
      setPageVisible(visible);
      if (!visible) {
        setCursorVisible(false);
        setCursorPressing(false);
      }
    };
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      setReduceMotion(media.matches);
      if (media.matches) {
        setCursorVisible(false);
        setCursorPressing(false);
      }
    };
    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  }, []);

  useEffect(() => {
    const screen = screenRef.current;
    if (!screen || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      moveCursorToTab(cursorTab);
      updateIndicator(activeTabRef.current);
    });
    observer.observe(screen);
    return () => observer.disconnect();
  }, [cursorTab, moveCursorToTab, updateIndicator]);

  useEffect(() => updateIndicator(activeTab), [activeTab, updateIndicator]);

  const canAutoplay =
    autoplayEnabled && isInView && pageVisible && !manualPause && !interactionHeld && !reduceMotion;

  useEffect(() => {
    if (!canAutoplay) {
      return;
    }

    let stopped = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const later = (callback: () => void, delay: number) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (!stopped) callback();
      }, delay);
      timers.add(timer);
    };

    const runCycle = () => {
      const currentIndex = DEMO_TABS.findIndex((tab) => tab.id === activeTabRef.current);
      const nextTab = DEMO_TABS[(currentIndex + 1) % DEMO_TABS.length].id;
      setCursorPressing(false);
      setCursorTab(activeTabRef.current);
      moveCursorToTab(activeTabRef.current);
      setCursorVisible(true);
      later(() => {
        setCursorTab(nextTab);
        moveCursorToTab(nextTab);
      }, 260);
      later(() => setCursorPressing(true), 1080);
      later(() => selectTab(nextTab), 1220);
      later(() => setCursorPressing(false), 1430);
      later(runCycle, 4800);
    };

    runCycle();
    return () => {
      stopped = true;
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, [canAutoplay, moveCursorToTab, selectTab]);

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % DEMO_TABS.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + DEMO_TABS.length) % DEMO_TABS.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = DEMO_TABS.length - 1;
    else return;

    event.preventDefault();
    chooseTab(DEMO_TABS[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  }

  function handleFocusOut(event: FocusEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget;
    if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
      setFocusHeld(false);
    }
  }

  function toggleAutoplay() {
    const nextEnabled = !autoplayEnabled;
    setAutoplayEnabled(nextEnabled);
    setCursorVisible(false);
    setCursorPressing(false);
    if (nextEnabled) {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
      setManualPause(false);
    }
  }

  let demoStatusText = "切页、勾选、筛选、搜索与滚动，都可以由你接管。";
  if (reduceMotion) demoStatusText = "已遵循系统设置关闭自动动画，四个页面仍可手动操作。";
  else if (focusHeld) demoStatusText = "你正在操作当前控件；焦点离开后会自动续播。";
  else if (pointerHeld) demoStatusText = "你正在接管演示；移出电脑屏幕后会自动续播。";
  else if (manualPause && autoplayEnabled) demoStatusText = "演示已让位，稍后会从当前页面继续。";
  else if (!autoplayEnabled) demoStatusText = "自动演示已暂停，四个页面仍可手动操作。";

  return (
    <div
      className="pd-root"
      ref={rootRef}
      role="region"
      aria-label="NotchTodo 交互产品演示"
    >
      <div className="pd-hardware">
        <div
          className="pd-screen"
          ref={screenRef}
          onPointerEnter={() => {
            setPointerHeld(true);
            pauseAutoplay();
          }}
          onPointerLeave={() => setPointerHeld(false)}
          onPointerDownCapture={pauseAutoplay}
          onTouchStart={pauseAutoplay}
          onFocusCapture={() => {
            setFocusHeld(true);
            pauseAutoplay();
          }}
          onBlurCapture={handleFocusOut}
        >
          <div className="pd-wallpaper" aria-hidden="true"><i /><i /><i /></div>
          <div className="pd-menu-bar" aria-hidden="true">
            <div><strong>●</strong><span>NotchTodo</span><span>文件</span><span>编辑</span></div>
            <div><span>⌁</span><span>◉</span><span>周四 09:41</span></div>
          </div>
          <div className="pd-physical-notch" aria-hidden="true"><i /></div>

          <div className="pd-app-window">
            <div className="pd-app-topbar">
              <div className="pd-tab-list" ref={tabListRef} role="tablist" aria-label="NotchTodo 页面">
                {DEMO_TABS.map((tab, index) => (
                  <button
                    type="button"
                    role="tab"
                    id={`${idBase}-tab-${tab.id}`}
                    aria-controls={`${idBase}-panel-${tab.id}`}
                    aria-selected={activeTab === tab.id}
                    tabIndex={activeTab === tab.id ? 0 : -1}
                    className={activeTab === tab.id ? "is-active" : ""}
                    key={tab.id}
                    ref={(node) => { tabRefs.current[index] = node; }}
                    onClick={() => chooseTab(tab.id)}
                    onKeyDown={(event) => handleTabKeyDown(event, index)}
                  >
                    <TabIcon tab={tab.id} />{tab.label}
                  </button>
                ))}
                <span
                  className="pd-tab-indicator"
                  style={{ left: indicatorGeometry.left, width: indicatorGeometry.width }}
                  aria-hidden="true"
                />
              </div>
              <div className="pd-topbar-safe" />
              {activeTab === "apps" && (
                <label className="pd-app-search">
                  <span aria-hidden="true">⌕</span>
                  <input
                    type="search"
                    value={appQuery}
                    onChange={(event) => setAppQuery(event.target.value)}
                    placeholder="搜索应用…"
                    aria-label="搜索演示应用"
                  />
                </label>
              )}
              <span className="pd-collapse" aria-hidden="true">⌃</span>
            </div>

            <div className="pd-panel-stack">
              {DEMO_TABS.map((tab) => (
                <div
                  className={activeTab === tab.id ? "pd-panel is-active" : "pd-panel"}
                  id={`${idBase}-panel-${tab.id}`}
                  role="tabpanel"
                  aria-labelledby={`${idBase}-tab-${tab.id}`}
                  aria-hidden={activeTab !== tab.id}
                  inert={activeTab !== tab.id}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  key={tab.id}
                >
                  <PanelContent tab={tab.id} appQuery={appQuery} />
                </div>
              ))}
            </div>
          </div>

          <div className="pd-desktop-dock" aria-hidden="true">
            {APPS.slice(0, 7).map(([glyph, name, icon, tone]) => (
              <span className={`pd-icon-${icon} pd-tone-${tone}`} key={name}>{glyph}</span>
            ))}
          </div>

          <div
            className={`pd-auto-cursor${cursorVisible ? " is-visible" : ""}${cursorPressing ? " is-pressing" : ""}`}
            style={{
              "--pd-cursor-x": `${cursorPosition.x}px`,
              "--pd-cursor-y": `${cursorPosition.y}px`,
            } as CSSProperties}
            aria-hidden="true"
          >
            <span><i /></span>
          </div>
        </div>
        <div className="pd-camera-mark" aria-hidden="true" />
      </div>
      <div className="pd-hinge" aria-hidden="true"><span /></div>
      <div className="pd-mobile-tabs" role="group" aria-label="移动端演示页面">
        {DEMO_TABS.map((tab) => (
          <button
            className={activeTab === tab.id ? "is-active" : ""}
            type="button"
            aria-pressed={activeTab === tab.id}
            onClick={() => chooseTab(tab.id)}
            key={tab.id}
          >
            <TabIcon tab={tab.id} />{tab.label}
          </button>
        ))}
      </div>
      <div className="pd-demo-footer">
        <button
          className="pd-autoplay-toggle"
          type="button"
          aria-pressed={reduceMotion || !autoplayEnabled}
          disabled={reduceMotion}
          onClick={toggleAutoplay}
        >
          <span aria-hidden="true">{reduceMotion ? "—" : autoplayEnabled ? "Ⅱ" : "▶"}</span>
          {reduceMotion ? "已关闭自动演示" : autoplayEnabled ? "暂停自动演示" : "继续自动演示"}
        </button>
        <p className="pd-a11y-note" aria-live="polite" aria-atomic="true">
          {demoStatusText}
        </p>
      </div>
    </div>
  );
}
