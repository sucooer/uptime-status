'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { HudButton } from './HudButton';

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
  const [, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [justDone, setJustDone] = useState(false);
  const prevPendingRef = useRef(false);

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

  useEffect(() => {
    if (pending) {
      setJustDone(false);
    } else if (prevPendingRef.current) {
      setJustDone(true);
      const id = setTimeout(() => setJustDone(false), 1200);
      prevPendingRef.current = pending;
      return () => clearTimeout(id);
    }
    prevPendingRef.current = pending;
  }, [pending]);

  const age = mounted ? relative(updatedAt) : '';
  const secondsToNext = Math.max(
    0,
    Math.round(intervalMs / 1000) - Math.round(((Date.now() - updatedAt) % intervalMs) / 1000),
  );
  const intervalSec = Math.max(1, Math.round(intervalMs / 1000));
  const progress = Math.min(1, Math.max(0, 1 - secondsToNext / intervalSec));

  // 环形进度参数
  const r = 7;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress);

  return (
    <div className="flex items-center gap-3">
      {/* 状态文字与动态圆环 */}
      <div
        suppressHydrationWarning
        className="hidden items-center gap-2.5 rounded-full border border-line/40 bg-surface/40 px-3 py-1.5 backdrop-blur-md font-mono text-xs text-subtle sm:inline-flex tnum"
      >
        <span className="relative flex h-2 w-2 items-center justify-center">
          <span
            className={`absolute h-full w-full rounded-full opacity-75 ${
              pending ? 'animate-ping bg-degraded' : 'animate-pulse bg-signal'
            }`}
          />
          <span
            className={`relative h-1.5 w-1.5 rounded-full ${
              pending ? 'bg-degraded' : 'bg-signal'
            }`}
          />
        </span>
        <span className="tracking-tight">
          {mounted ? (
            <>
              更新于 <span className="text-ink font-medium">{age}</span>
              <span className="mx-1 text-line-strong">·</span>
              <span className="text-accent">{secondsToNext}s</span> 后同步
            </>
          ) : (
            '连接中…'
          )}
        </span>
      </div>

      {/* 刷新按钮：带 SVG 环形进度条 */}
      <HudButton
        onClick={() => startTransition(() => router.refresh())}
        disabled={pending}
        aria-label="立即同步"
        title="立即同步最新数据"
        suppressHydrationWarning
        className="group relative h-9 gap-2 rounded-full border-line/60 bg-surface/60 px-3.5 font-sans text-xs font-medium text-ink transition-all duration-300 hover:border-accent/50 hover:bg-surface/90 hover:shadow-glow-accent disabled:opacity-60"
      >
        {/* 微型环形进度或旋转箭头 */}
        <span className="relative flex h-4 w-4 items-center justify-center">
          {justDone ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-signal animate-enter"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <>
              {/* 环形进度底圈与进度弧 */}
              <svg className="h-4 w-4 -rotate-90 transform" viewBox="0 0 18 18">
                <circle
                  cx="9"
                  cy="9"
                  r={r}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-line/40"
                />
                <circle
                  cx="9"
                  cy="9"
                  r={r}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={c}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  className={`text-accent transition-[stroke-dashoffset] duration-1000 ease-linear ${
                    pending ? 'animate-spin' : ''
                  }`}
                />
              </svg>
              {/* 内部微图标 */}
              <svg
                width="8"
                height="8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`absolute ${pending ? 'animate-spin text-accent' : 'text-subtle group-hover:text-ink'}`}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </>
          )}
        </span>

        <span className={`tracking-tight ${justDone ? 'text-signal' : ''}`}>
          {justDone ? '已同步' : pending ? '同步中' : '同步'}
        </span>
      </HudButton>
    </div>
  );
}
