import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "NotchTodo — 把 Mac 刘海变成随手工作台";
const description =
  "常驻 macOS 刘海的本机工作台：待办、剪贴板、Markdown 速记、应用启动与可选 AI 完成提醒。";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || requestHeaders.get("host");
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol || (host?.startsWith("localhost") ? "http" : "https");
  const origin = host ? `${protocol}://${host}` : "http://localhost:3000";
  const socialImage = `${origin}/og.png`;

  return {
    title,
    description,
    applicationName: "NotchTodo",
    keywords: [
      "NotchTodo",
      "macOS 刘海",
      "Mac 待办",
      "剪贴板历史",
      "Markdown 速记",
      "Apple Silicon",
    ],
    icons: {
      icon: [{ url: "/favicon.png", type: "image/png" }],
      shortcut: "/favicon.png",
      apple: "/favicon.png",
    },
    openGraph: {
      type: "website",
      locale: "zh_CN",
      siteName: "NotchTodo",
      title,
      description:
        "待办、剪贴板、Markdown 速记和常用应用，都收在屏幕顶端。核心数据只留在这台 Mac。",
      url: origin,
      images: [{ url: socialImage, width: 1200, height: 630, alt: "NotchTodo 官网分享封面" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: "需要时展开，用完即收起的 macOS 刘海工作台。",
      images: [socialImage],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
  themeColor: "#030303",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
