"use client";

import Image from "next/image";
import ProductDemo from "./ProductDemo";
import SideRays from "./SideRays";

const DOWNLOAD_URL = "https://github.com/chusimin/notch-todo/releases/latest";
const GITHUB_URL = "https://github.com/chusimin/notch-todo";

const featureCards = [
  {
    number: "01",
    kicker: "优先级待办",
    title: "一眼回到重点",
    body: "用 P0–P3 四个优先级模块整理轻重缓急。输入后按回车新增，完成、删除和数量变化都清楚可见。",
  },
  {
    number: "02",
    kicker: "剪贴板历史",
    title: "复制过的，随时拿回来",
    body: "自动保存最近的文字、链接与图片。支持筛选、收藏、删除和一键写回，按下 ⌘⇧V 即可召唤。",
  },
  {
    number: "03",
    kicker: "Markdown 速记",
    title: "临时想法，也能有结构",
    body: "标题、列表、待办、引用、粗体与代码都能即时预览。输入后自动保存在本机。",
  },
  {
    number: "04",
    kicker: "应用启动坞",
    title: "常用应用，一点就开",
    body: "搜索、收藏并调整应用顺序。首页快捷入口与应用页共用同一组收藏。",
  },
  {
    number: "05",
    kicker: "临时镜子",
    title: "只在需要时打开",
    body: "点按后才请求摄像头权限；离开首页、收起面板或再次点击，就立即停止预览。",
  },
  {
    number: "06",
    kicker: "多屏与菜单栏",
    title: "始终待在正确的位置",
    body: "跟随活跃屏幕重新居中，常驻菜单栏，并记住你上次使用的页面。",
  },
] as const;

const faqs = [
  {
    question: "我的 Mac 可以安装吗？",
    answer:
      "当前下载包支持 macOS 11 或更高版本、Apple Silicon（M1 或更新芯片），并为带刘海的 MacBook 优化。暂不提供 Intel、Windows 或 Linux 版本。",
  },
  {
    question: "待办和剪贴板内容会上传吗？",
    answer:
      "不会。待办、速记、收藏与剪贴板历史都保存在本机，应用没有账号、云同步或行为分析。普通复制内容会按设计进入本机历史，你可以单条删除或一键清空。",
  },
  {
    question: "会不会把密码也记录下来？",
    answer:
      "检测到 macOS ConcealedType 标记的密码管理器内容时会跳过记录；但普通文本形式复制的敏感信息仍可能进入本机历史，因此不应把它理解为完整的密码识别工具。",
  },
  {
    question: "摄像头会一直开启吗？",
    answer:
      "不会。镜子默认关闭，只有你点按后才会请求权限。离开首页、收起面板或再次点击镜子时，视频轨道会立即停止。",
  },
  {
    question: "Codex / GPT 完成提醒安装后就能用吗？",
    answer:
      "提醒窗口已经内置，但需要你先配置本机 Hook 或调用本机通知接口。当前只负责即时提醒，不保存完成历史，也不能点击跳转到对应对话。",
  },
  {
    question: "为什么首次打开会看到系统提示？",
    answer:
      "当前安装包采用 ad-hoc 签名、尚未完成 Apple 公证。首次打开时可能需要在 Finder 中右键应用并选择“打开”，确认后即可正常使用。",
  },
] as const;

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main-content">跳到主要内容</a>

      <header className="site-header">
        <div className="nav-shell">
          <a className="brand-lockup" href="#top" aria-label="NotchTodo 首页">
            <Image src="/notchtodo-logo.png" alt="" width={36} height={36} />
            <span>NotchTodo</span>
          </a>
          <nav className="nav-links" aria-label="主要导航">
            <a href="#demo">产品演示</a>
            <a href="#features">功能</a>
            <a href="#privacy">隐私</a>
            <a href="#faq">常见问题</a>
          </nav>
          <a className="nav-download" href={DOWNLOAD_URL}>下载 <span aria-hidden="true">↗</span></a>
        </div>
      </header>

      <main id="main-content">
        <section className="hero-section" id="top">
          <div className="hero-rays">
            <SideRays
              speed={1.15}
              rayColor1="#d8ffdf"
              rayColor2="#b9cbff"
              intensity={2.05}
              spread={1.55}
              origin="top-right"
              tilt={-5}
              saturation={0.92}
              blend={0.62}
              falloff={1.72}
              opacity={0.82}
            />
          </div>
          <div className="hero">
            <div className="hero-copy">
            <div className="eyebrow"><span className="status-light" />专为 macOS 刘海打造</div>
            <h1>
              <span className="hero-title-line">把 Mac 刘海，</span>
              <span className="hero-title-line hero-title-secondary">
                变成随手<br className="hero-title-break" />工作台。
              </span>
            </h1>
            <p className="hero-lede">
              待办、剪贴板、Markdown 速记和常用应用，都收在屏幕顶端。
              点一下展开，用完即收起；核心数据只留在这台 Mac。
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href={DOWNLOAD_URL}>
                下载 macOS 版 <span aria-hidden="true">↓</span>
              </a>
              <a className="button button-secondary" href={GITHUB_URL}>
                在 GitHub 查看源码 <span aria-hidden="true">↗</span>
              </a>
            </div>
            <div className="hero-meta" aria-label="系统要求">
              <span>macOS 11+</span>
              <span>Apple Silicon</span>
              <span>免费开源</span>
            </div>
            <p className="install-note">当前安装包未公证，首次打开可能需要在 Finder 中右键确认。</p>
            </div>

            <div className="hero-object" aria-label="NotchTodo 应用图标展示">
              <div className="hero-orbit hero-orbit-one" />
              <div className="hero-orbit hero-orbit-two" />
              <div className="logo-plinth">
                <Image
                  src="/notchtodo-logo.png"
                  alt="NotchTodo 银色应用图标"
                  width={620}
                  height={620}
                  priority
                  sizes="(max-width: 820px) 78vw, 42vw"
                />
              </div>
              <div className="hero-status-card">
                <span className="status-light" />
                <div><strong>随时可用</strong><small>常驻屏幕顶部</small></div>
              </div>
              <div className="hero-key-card"><kbd>⌘</kbd><kbd>⇧</kbd><kbd>V</kbd><span>召唤剪贴板</span></div>
            </div>
          </div>
        </section>

        <section className="product-section section-shell" id="demo">
          <div className="section-heading section-heading-wide">
            <div>
              <span className="section-index">01 / 实际体验</span>
              <h2>需要时出现，<br />其余时间保持安静。</h2>
            </div>
            <p>演示会自己在四个页面间走一圈。把鼠标移进屏幕，或直接点击任一页面，自动操作就会暂时让位给你。</p>
          </div>

          <div className="demo-stage"><ProductDemo /></div>
          <p className="demo-caption">界面按桌面端实际布局等比模拟；演示内容均为脱敏示例。</p>
        </section>

        <section className="features-section section-shell" id="features">
          <div className="section-heading">
            <div>
              <span className="section-index">02 / 常用能力</span>
              <h2>少开几个窗口，<br />也少丢几次思路。</h2>
            </div>
            <p>临时记下的事、刚复制的内容、下一步要打开的应用，不必再散落在不同窗口。</p>
          </div>

          <div className="feature-grid">
            {featureCards.map((feature) => (
              <article className="feature-card" key={feature.number}>
                <div className="feature-card-top"><span>{feature.number}</span><i aria-hidden="true" /></div>
                <p className="feature-kicker">{feature.kicker}</p>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>

          <aside className="ai-callout">
            <div className="ai-callout-mark"><span className="status-light" />AI</div>
            <div>
              <span className="feature-kicker">可选本机集成</span>
              <h3>AI 做完了，轻轻提醒你。</h3>
              <p>接入 Codex 或 GPT 的本机完成事件后，任务结束会在顶部弹出不抢焦点的提醒。悬停可暂停，点击即可关闭。</p>
            </div>
            <p className="ai-caveat">需要配置本机 Hook 或通知接口<br />不含历史记录与对话跳转</p>
          </aside>
        </section>

        <section className="privacy-section" id="privacy">
          <div className="section-shell privacy-shell">
            <div className="privacy-copy">
              <span className="section-index">03 / 隐私设计</span>
              <h2>你的工作内容，<br />不需要离开这台 Mac。</h2>
              <p>NotchTodo 不设账号、不做云同步，也没有行为分析。待办、速记、收藏与剪贴记录都保存在本机。</p>
              <div className="privacy-signal"><span className="status-light" />本机存储正在工作</div>
            </div>
            <div className="privacy-list">
              <article>
                <span>01</span>
                <div><h3>内容不上云</h3><p>LocalStorage 与本机图片目录负责保存数据，没有内容上传链路。</p></div>
              </article>
              <article>
                <span>02</span>
                <div><h3>摄像头按需开启</h3><p>镜子默认关闭；收起或离开首页，就立即停止摄像头轨道。</p></div>
              </article>
              <article>
                <span>03</span>
                <div><h3>剪贴历史由你掌控</h3><p>支持单条删除与一键清空；检测到系统隐藏类型的密码管理器内容会跳过。</p></div>
              </article>
              <article>
                <span>04</span>
                <div><h3>提醒只走回环地址</h3><p>Codex/GPT 通知接口仅监听 127.0.0.1，不暴露给局域网或公网。</p></div>
              </article>
            </div>
          </div>
        </section>

        <section className="requirements-section section-shell">
          <div className="requirements-card">
            <div>
              <span className="section-index">下载前确认</span>
              <h2>为 Apple Silicon Mac 准备。</h2>
            </div>
            <div className="requirement-list">
              <p><span>系统</span><strong>macOS 11 或更高</strong></p>
              <p><span>芯片</span><strong>Apple Silicon · M1+</strong></p>
              <p><span>价格</span><strong>免费 · MIT 开源</strong></p>
              <p><span>签名</span><strong>Ad-hoc · 尚未公证</strong></p>
            </div>
          </div>
        </section>

        <section className="faq-section section-shell" id="faq">
          <div className="section-heading faq-heading">
            <div>
              <span className="section-index">04 / 常见问题</span>
              <h2>下载之前，<br />你可能想知道。</h2>
            </div>
          </div>
          <div className="faq-list">
            {faqs.map((faq, index) => (
              <details key={faq.question}>
                <summary><span>{String(index + 1).padStart(2, "0")}</span>{faq.question}<i aria-hidden="true">＋</i></summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="final-cta section-shell">
          <div className="final-cta-inner">
            <Image src="/notchtodo-logo.png" alt="" width={180} height={180} />
            <span className="eyebrow"><span className="status-light" />准备就绪</span>
            <h2>让刘海，真正有点用。</h2>
            <p>把每天反复打开的几个小工具，收进屏幕顶部。</p>
            <div className="hero-actions final-actions">
              <a className="button button-primary" href={DOWNLOAD_URL}>下载 Apple Silicon 版 <span aria-hidden="true">↓</span></a>
              <a className="button button-secondary" href={GITHUB_URL}>查看安装说明 <span aria-hidden="true">↗</span></a>
            </div>
            <small>macOS 11+ · 免费开源 · 首次打开可能需要右键确认</small>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-shell">
          <div className="brand-lockup footer-brand">
            <Image src="/favicon.png" alt="" width={30} height={30} />
            <span>NotchTodo</span>
          </div>
          <p>把高频小动作，留在 Mac 刘海下面。</p>
          <div>
            <a href={GITHUB_URL}>GitHub</a>
            <a href={`${GITHUB_URL}/issues`}>反馈问题</a>
            <a href={`${GITHUB_URL}#license`}>许可说明</a>
          </div>
        </div>
      </footer>
    </>
  );
}
