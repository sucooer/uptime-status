'use client';

import { useState } from 'react';

/**
 * 站点标识。
 * 配置了 NEXT_PUBLIC_LOGO_URL 时优先展示该图片；图片加载失败（图床 403/404、
 * 网络不可达等）时自动回退到内置图标，避免渲染成破图。
 */
export function SiteLogo({ src }: { src?: string }) {
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return (
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-line bg-surface text-accent"
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M2 12h4l3-7 4 14 3-7h6" />
        </svg>
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      onError={() => setBroken(true)}
      className="h-9 w-9 shrink-0 rounded border border-line object-contain"
    />
  );
}
