import type { Metadata, Viewport } from 'next';
import './globals.css';
import { siteConfig } from '@/lib/config';
import { AmbientAuraBackground } from '@/components/AmbientAuraBackground';

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  icons: siteConfig.logoUrl ? { icon: siteConfig.logoUrl } : undefined,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

// 阻止深色模式首屏闪烁
const themeScript = `
try {
  var t = localStorage.getItem('theme');
  var dark = t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', dark);
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-transparent selection:bg-accent/20">
        <AmbientAuraBackground />
        {children}
      </body>
    </html>
  );
}
