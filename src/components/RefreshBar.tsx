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
  const [tick, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [justDone, setJustDone] = useState(false);
  const prevPendingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
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

  // 完成态：pending 由 true 变 false 后短暂显示「已刷新」
  useEffect(() => {
    if (pending) {
      setJustDone(false);
    } else if (prevPendingRef.current) {
      setJustDone(true);
      const id = setTimeout(() => setJustDone(false), 900);
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

  return (
    <div className="flex items-center gap-2.5">
      <span
        suppressHydrationWarning
        className="hidden items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-subtle sm:inline-flex tnum"
      >
        <span
          aria-hidden
          className={`h-1.5 w-1.5 shrink-0 animate-breathe rounded-full shadow-[0_0_8px_var(--tw-shadow-color)] ${pending ? 'bg-degraded shadow-degraded/60' : 'bg-signal shadow-signal/60'}`}
        />
        {mounted ? `更新于 ${age} · ${secondsToNext}s 后刷新` : '加载中…'}
      </span>

      <HudButton
        onClick={() => startTransition(() => router.refresh())}
        disabled={pending}
        aria-label="立即刷新"
        title="立即刷新"
        suppressHydrationWarning
        data-pending={pending}
        className="relative h-11 gap-1.5 overflow-hidden px-2.5 font-mono text-2xs uppercase tracking-wider disabled:opacity-60"
      >
        {/* 取数进行时的扫掠，给「正在诊断」一个可见的执行反馈 */}
        {pending && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-full animate-scan bg-gradient-to-r from-transparent via-accent/25 to-transparent"
          />
        )}
        {mounted && !pending && !reduceMotion && (
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-0 h-[2px] bg-signal transition-[width] duration-1000 ease-linear"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        )}
        {justDone ? (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="text-signal"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="refresh-icon"
          >
            <path d="M21 12a9 9 0 1 1-2.6-6.4" />
            <path d="M21 3v6h-6" />
          </svg>
        )}
        <span
          aria-live="polite"
          aria-atomic="true"
          className={justDone ? 'text-signal' : undefined}
        >
          {justDone ? '已刷新' : pending ? '刷新中' : '刷新'}
        </span>
      </HudButton>
      <span hidden>{tick}</span>
    </div>
  );
}
