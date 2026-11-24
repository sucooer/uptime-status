'use client';

import { useState } from 'react';

/**
 * 站点标识：现代高光微玻璃徽章
 */
export function SiteLogo({ src }: { src?: string }) {
  const [broken, setBroken] = useState(false);

  const containerStyle =
    'group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 dark:border-white/10 border-black/5 bg-surface/60 backdrop-blur-md shadow-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-105 hover:border-accent/40 hover:shadow-glow-accent';

  if (!src || broken) {
    return (
      <span aria-hidden className={containerStyle}>
        <span className="absolute inset-0 rounded-xl bg-gradient-to-tr from-accent/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-accent transition-transform duration-300 group-hover:scale-110"
        >
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      </span>
    );
  }

  return (
    <span className={containerStyle}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        onError={() => setBroken(true)}
        className="h-6 w-6 object-contain transition-transform duration-300 group-hover:scale-110"
      />
    </span>
  );
}
