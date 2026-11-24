'use client';

import { useEffect, useRef, useState } from 'react';
import type { DayCell, OverallState, StatusStats } from '@/lib/types';
import { UptimeTrace, UptimeLegend } from './UptimeTrace';
import { AnimatedCounter } from './AnimatedCounter';

const HERO: Record<
  OverallState,
  { title: string; desc: string; tone: 'up' | 'degraded' | 'down' | 'muted' }
> = {
  up: { title: '所有系统运行正常', desc: '全部受监控的站点与核心服务运行平稳，无异常波动。', tone: 'up' },
  degraded: {
    title: '部分服务近期出现异常',
    desc: '有服务在过去 24 小时内记录到中断或抖动，目前已恢复，持续观察中。',
    tone: 'degraded',
  },
  down: {
    title: '检测到服务中断',
    desc: '部分核心服务当前不可用，已自动告警，运维团队正在全力恢复中。',
    tone: 'down',
  },
  unknown: {
    title: '状态获取失败',
    desc: '暂时无法连接到 Uptime 遥测端点，请检查网络或稍后重试。',
    tone: 'muted',
  },
};

interface Props {
  overall: OverallState;
  stats: StatusStats;
  days: DayCell[];
  historyDays: number;
  timezone: string;
}

export function OverallHero({ overall, stats, days, historyDays, timezone }: Props) {
  const h = HERO[overall];
  const frameRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (rafRef.current !== null) return;
    const clientX = e.clientX;
    const clientY = e.clientY;

    rafRef.current = requestAnimationFrame(() => {
      const frame = frameRef.current;
      if (frame) {
        const rect = frame.getBoundingClientRect();
        frame.style.setProperty('--mouse-x', `${clientX - rect.left}px`);
        frame.style.setProperty('--mouse-y', `${clientY - rect.top}px`);
      }
      rafRef.current = null;
    });
  };

  return (
    <section className="animate-enter pt-6 pb-2">
      {/* 状态结论：大标题 + 动态脉冲信标 */}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 pb-6 pt-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <StatusBeacon tone={h.tone} />
            <span className="eyebrow flex items-center gap-1.5">
              <span>系统运行总览</span>
              <span className="text-line-strong">/</span>
              <span className="text-accent font-semibold">LIVE OBSERVATORY</span>
            </span>
          </div>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl text-balance">
            {h.title}
          </h1>
          <p className="mt-1.5 max-w-[56ch] text-xs leading-relaxed text-ink2 text-pretty sm:text-sm">
            {h.desc}
          </p>
        </div>

        <div className="shrink-0 rounded-full border border-line/60 bg-surface/50 px-3.5 py-1.5 backdrop-blur-md font-mono text-xs text-subtle">
          <span className="text-accent font-medium">{historyDays} 天</span>
          <span className="mx-1 text-line-strong">·</span>
          <span>连续遥测窗口</span>
        </div>
      </div>

      {/* 现代悬浮晶体岛看板 */}
      <div
        ref={frameRef}
        onMouseMove={handleMouseMove}
        className="hud-frame relative"
      >
        <div className="grid grid-cols-1 md:grid-cols-[140px_minmax(0,1fr)_160px] divide-y md:divide-y-0 md:divide-x divide-line/40">
          {/* 左：核心计数读数 */}
          <aside className="grid grid-cols-3 gap-3 p-4 sm:p-5 md:flex md:flex-col md:justify-center md:gap-5">
            <ReadoutItem label="监控总数" value={stats.total} tone="default" />
            <ReadoutItem label="正常运行" value={stats.up} tone="up" />
            <ReadoutItem
              label="异常中断"
              value={stats.down}
              tone={stats.down > 0 ? 'down' : 'default'}
            />
            {stats.paused > 0 && (
              <div className="col-span-3 font-mono text-xs text-subtle md:col-span-1">
                已暂停 <span className="font-medium text-ink2">{stats.paused}</span>
              </div>
            )}
          </aside>

          {/* 中：90 天全景可用率迹线 */}
          <section className="flex flex-col justify-between p-4 sm:p-6">
            <div>
              <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <span className="eyebrow text-ink font-medium">最近 {historyDays} 天服务可用率</span>
                </div>
                <UptimeLegend />
              </div>

              {days.length > 0 ? (
                <>
                  <UptimeTrace days={days} timezone={timezone} height={96} inspectable />
                  <div className="mt-2.5 flex items-center justify-between font-mono text-xs text-subtle">
                    <span>{historyDays} 天前</span>
                    <span>今天</span>
                  </div>
                </>
              ) : (
                <div className="flex h-[96px] items-center justify-center rounded-xl border border-dashed border-line">
                  <span className="eyebrow">暂无可用率记录</span>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-line/40 pt-3 font-mono text-xs text-subtle">
              <span>悬停或聚焦查看详情，支持 ← → 方向键逐日检视</span>
              <span className="rounded-md bg-surface2/60 px-2 py-0.5 text-accent font-medium">
                {timezone}
              </span>
            </div>
          </section>

          {/* 右：遥测（24h 弧形量表 + 平均延迟） */}
          <aside className="flex items-center justify-around gap-6 p-4 sm:p-6 md:flex-col md:justify-center md:gap-6">
            <ModernUptimeGauge value={stats.avgUptime24h} />
            <div className="text-center md:w-full">
              <span className="eyebrow block">平均响应延迟</span>
              <div className="mt-1 flex items-baseline justify-center font-mono text-2xl font-semibold leading-none text-ink">
                {stats.avgResponseMs !== null ? (
                  <>
                    <AnimatedCounter value={Math.round(stats.avgResponseMs)} duration={600} />
                    <span className="ml-1 text-xs font-normal text-subtle">ms</span>
                  </>
                ) : (
                  <span className="text-subtle">—</span>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

/** 脉冲雷达信标 */
function StatusBeacon({ tone }: { tone: 'up' | 'degraded' | 'down' | 'muted' }) {
  const isUp = tone === 'up';
  const isDown = tone === 'down';
  const isDegraded = tone === 'degraded';

  const baseColor = isDown
    ? 'bg-rose-500 shadow-[0_0_16px_rgba(244,63,94,0.9)]'
    : isDegraded
    ? 'bg-amber-500 shadow-[0_0_16px_rgba(245,158,11,0.8)]'
    : isUp
    ? 'bg-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.8)]'
    : 'bg-slate-400';

  const ringColor = isDown
    ? 'border-rose-500/70'
    : isDegraded
    ? 'border-amber-500/60'
    : 'border-emerald-500/60';

  return (
    <span className="relative flex h-3.5 w-3.5 items-center justify-center">
      {/* 涟漪扩散环 */}
      <span
        className={`absolute inset-0 rounded-full border ${ringColor} animate-radar opacity-80`}
      />
      <span
        className={`absolute -inset-1 rounded-full border ${ringColor} animate-radar opacity-40`}
        style={{ animationDelay: '1.4s' }}
      />
      {/* 核心光点 */}
      <span className={`relative h-2.5 w-2.5 rounded-full ${baseColor}`} />
    </span>
  );
}

function ReadoutItem({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'up' | 'down';
}) {
  const color =
    tone === 'up'
      ? 'text-emerald-500 dark:text-emerald-400'
      : tone === 'down'
      ? 'text-rose-500 dark:text-rose-400'
      : 'text-ink';

  return (
    <div className="flex flex-col">
      <span className="eyebrow block text-subtle">{label}</span>
      <span className={`mt-1 font-mono text-2xl font-semibold leading-none ${color}`}>
        <AnimatedCounter value={value} duration={600} />
      </span>
    </div>
  );
}

/* ------------------------------ 24h 径向量表 ------------------------------ */

const GAUGE_START = 135;
const GAUGE_SWEEP = 270;

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, from: number, to: number): string {
  const a = polar(cx, cy, r, from);
  const b = polar(cx, cy, r, to);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

function ModernUptimeGauge({ value }: { value: number | null }) {
  const targetPct = value === null ? 0 : Math.min(100, Math.max(0, value));
  const [arcPct, setArcPct] = useState(0);

  useEffect(() => {
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) {
      setArcPct(targetPct);
      return;
    }

    let startTime: number | null = null;
    let animId: number;
    const duration = 900;

    const step = (t: number) => {
      if (!startTime) startTime = t;
      const elapsed = t - startTime;
      const p = Math.min(elapsed / duration, 1);
      // smooth ease-out-quart
      const ease = 1 - Math.pow(1 - p, 4);
      setArcPct(targetPct * ease);

      if (p < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setArcPct(targetPct);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [targetPct]);

  const end = GAUGE_START + (GAUGE_SWEEP * arcPct) / 100;
  const endPoint = polar(50, 50, 38, end);

  return (
    <div className="relative flex flex-col items-center">
      <svg
        viewBox="0 0 100 100"
        className="h-24 w-24 shrink-0 transition-transform duration-300 hover:scale-105"
        role="img"
        aria-label={value === null ? '24小时可用率暂无' : `24小时平均可用率 ${targetPct.toFixed(2)}%`}
      >
        {/* 背景底槽 */}
        <path
          d={arcPath(50, 50, 38, GAUGE_START, GAUGE_START + GAUGE_SWEEP)}
          fill="none"
          className="stroke-line/50"
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* 动态可用率弧度 */}
        {value !== null && arcPct > 0 && (
          <>
            <path
              d={arcPath(50, 50, 38, GAUGE_START, end)}
              fill="none"
              className="stroke-emerald-500"
              strokeWidth={3.5}
              strokeLinecap="round"
              style={{
                filter: 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.6))',
              }}
            />
            {/* 顶端发光光斑 */}
            <circle
              cx={endPoint.x}
              cy={endPoint.y}
              r={2.5}
              className="fill-emerald-400 shadow-[0_0_8px_#34d399]"
            />
          </>
        )}

        <text
          x={50}
          y={49}
          textAnchor="middle"
          className="fill-ink font-mono text-[17px] font-semibold tnum"
        >
          {value === null ? '—' : arcPct.toFixed(2)}%
        </text>
        <text
          x={50}
          y={63}
          textAnchor="middle"
          className="fill-subtle font-mono text-[6.5px] uppercase tracking-wider"
        >
          24H UPTIME
        </text>
      </svg>
    </div>
  );
}
