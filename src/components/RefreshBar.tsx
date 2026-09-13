'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  updatedAt: number;
  intervalMs: number;
}

function relative(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 5) return '刚刚';
  if (s < 60) return `${s} 秒前`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} 分钟前`;
  return `${Math.floor(m / 60)} 小时前`;
}

export function RefreshBar({ updatedAt, intervalMs }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tick, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // 自动刷新
  useEffect(() => {
    const id = setInterval(() => {
      startTransition(() => router.refresh());
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, router]);

  const age = mounted ? relative(updatedAt) : '';
  const secondsToNext = Math.max(
    0,
    Math.round(intervalMs / 1000) - Math.round(((Date.now() - updatedAt) % intervalMs) / 1000),
  );

  return (
    <div className="flex items-center gap-2.5">
      <span
        suppressHydrationWarning
        className="hidden font-mono text-2xs uppercase tracking-wider text-subtle sm:inline tnum"
      >
        {mounted ? `更新于 ${age} · ${secondsToNext}s 后刷新` : '加载中…'}
      </span>
      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        disabled={pending}
        aria-label="立即刷新"
        title="立即刷新"
        suppressHydrationWarning
        className="ctl h-9 gap-1.5 px-2.5 font-mono text-2xs uppercase tracking-wider disabled:opacity-50"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className={pending ? 'animate-spin' : ''}
        >
          <path d="M21 12a9 9 0 1 1-2.6-6.4" />
          <path d="M21 3v6h-6" />
        </svg>
        {pending ? '刷新中' : '刷新'}
      </button>
      <span hidden>{tick}</span>
    </div>
  );
}
