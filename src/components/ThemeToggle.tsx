'use client';

import { useEffect, useState } from 'react';
import { HudButton } from './HudButton';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
    setMounted(true);
  }, []);

  function toggle() {
    const next = !dark;
    const apply = () => {
      setDark(next);
      document.documentElement.classList.toggle('dark', next);
      try {
        localStorage.setItem('theme', next ? 'dark' : 'light');
      } catch {
        /* 隐私模式下忽略 */
      }
    };
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const doc = document as Document & { startViewTransition?: (callback: () => void) => void };
    if (!reduceMotion && typeof doc.startViewTransition === 'function') {
      doc.startViewTransition(apply);
    } else {
      apply();
    }
  }

  return (
    <HudButton
      onClick={toggle}
      aria-label="切换深浅主题"
      title="切换深浅主题"
      suppressHydrationWarning
      className="h-9 w-9 rounded-full border-line/60 bg-surface/60 p-0 text-ink2 transition-all duration-300 hover:border-accent/40 hover:bg-surface hover:text-ink hover:shadow-glow-accent"
    >
      <span key={dark ? 'sun' : 'moon'} className="animate-iconSwap flex items-center justify-center">
        {mounted && dark ? (
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        ) : (
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-sky-500 drop-shadow-[0_0_8px_rgba(14,165,233,0.4)]"
          >
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        )}
      </span>
    </HudButton>
  );
}
