'use client';

import { useEffect, useRef, useState } from 'react';
import type { DayCell, OverallState, StatusStats } from '@/lib/types';
import { UptimeTrace, UptimeLegend } from './UptimeTrace';
import { StatusDot } from './StatusDot';

const HERO: Record<
  OverallState,
  { title: string; desc: string; tone: 'up' | 'degraded' | 'down' | 'muted' }
> = {
  up: { title: '所有系统运行正常', desc: '监控中的全部服务均可正常访问。', tone: 'up' },
  degraded: {
    title: '部分服务近期出现异常',
    desc: '有服务在最近 24 小时内中断过，目前已恢复，仍在持续观察。',
    tone: 'degraded',
  },
  down: {
    title: '检测到服务中断',
    desc: '部分服务当前不可用，已收到告警并正在处理。',
    tone: 'down',
  },
  unknown: {
    title: '状态获取失败',
    desc: '暂时无法连接到 UptimeRobot，请稍后重试。',
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

/**
 * 状态总览 HUD：非对称三段式仪表盘。
 * 左 = 计数读数，中 = 90 天可用率迹线（本页的中心仪表），右 = 遥测（可用率量表 + 平均响应）。
 * 移动端按「读数行 → 迹线 → 遥测」纵向重排，而不是压缩桌面布局。
 */
export function OverallHero({ overall, stats, days, historyDays, timezone }: Props) {
  const h = HERO[overall];
  const live = overall === 'down';

  return (
    <section className="animate-enter">
      {/* 状态结论 */}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 pb-6 pt-7">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusDot tone={h.tone} className={live ? 'signal-halo' : undefined} />
            <span className="eyebrow">当前状态 / SYSTEM</span>
          </div>

          <h1 className="mt-3 text-[26px] font-semibold leading-tight tracking-tight sm:text-title text-balance">
            {h.title}
          </h1>
          <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-ink2 text-pretty">{h.desc}</p>
        </div>

        <div className="shrink-0 text-right font-mono text-2xs uppercase leading-relaxed tracking-label text-subtle">
          <span className="text-accent/80">SECTOR / OBSERVATORY</span>
          <br />
          {historyDays} 天观测窗口
        </div>
      </div>

      {/* 仪表主框 */}
      <div className="hud-frame">
        <div className="grid grid-cols-1 sm:grid-cols-[112px_minmax(0,1fr)_144px]">
          {/* 左：计数读数 */}
          <aside className="grid grid-cols-3 gap-3 border-b divider px-4 py-3.5 sm:block sm:border-b-0 sm:border-r sm:px-3.5 sm:py-4">
            <Readout label="监控项" value={stats.total} />
            <Readout label="正常" value={stats.up} tone="up" />
            <Readout label="异常" value={stats.down} tone={stats.down > 0 ? 'down' : undefined} />
            {stats.paused > 0 && (
              <p className="col-span-3 mt-1 font-mono text-2xs uppercase tracking-wider text-subtle sm:col-span-1 sm:mt-2">
                已暂停 {stats.paused}
              </p>
            )}
          </aside>

          {/* 中：可用率迹线 */}
          <section className="px-4 py-5 sm:px-5">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
              <span className="eyebrow">最近 {historyDays} 天记录</span>
              <UptimeLegend />
            </div>

            {days.length > 0 ? (
              <>
                <UptimeTrace days={days} timezone={timezone} height={96} />
                <div className="mt-2 flex items-center justify-between font-mono text-2xs uppercase tracking-wider text-subtle">
                  <span>{historyDays} 天前</span>
                  <span>今天</span>
                </div>
              </>
            ) : (
              <div className="flex h-[96px] items-center justify-center border border-dashed border-line">
                <span className="eyebrow">暂无历史记录</span>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t divider pt-2.5 font-mono text-2xs uppercase tracking-wider">
              <span className="text-subtle">悬停方块查看当日中断时长</span>
              <span className="text-accent/80">{timezone}</span>
            </div>
          </section>

          {/* 右：遥测 */}
          <aside className="flex items-center gap-5 border-t divider px-4 py-4 sm:block sm:border-l sm:border-t-0 sm:px-3.5">
            <UptimeGauge value={stats.avgUptime24h} />
            <div className="min-w-0 sm:mt-4">
              <span className="eyebrow block">平均响应</span>
              <span className="mt-1 block font-mono text-[22px] font-medium leading-none tnum text-ink">
                {stats.avgResponseMs !== null ? Math.round(stats.avgResponseMs) : '—'}
                <small className="ml-1 font-mono text-2xs font-normal text-subtle">ms</small>
              </span>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function Readout({ label, value, tone }: { label: string; value: number; tone?: 'up' | 'down' }) {
  const color = tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-ink';
  return (
    <div className="sm:py-2.5 sm:first:pt-0">
      <span className="eyebrow block">{label}</span>
      <span className={`mt-1 block font-mono text-[22px] font-medium leading-none tnum ${color}`}>
        <RollingDigits value={value} />
      </span>
    </div>
  );
}

function RollingDigits({ value }: { value: number }) {
  return (
    <>
      {String(value)
        .split('')
        .map((digit, index) => (
          <span key={`${index}-${digit}`} className="rolling-digit">
            {digit}
          </span>
        ))}
    </>
  );
}

/* ------------------------------ 径向量表 ------------------------------ */

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

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(t: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/** 24h 可用率量表：径向刻度 + 弧形读数，光效只落在读数弧上 */
function UptimeGauge({ value }: { value: number | null }) {
  const targetPct = value === null ? 0 : Math.min(100, Math.max(0, value));
  const [displayedPct, setDisplayedPct] = useState(0);
  const [arcPct, setArcPct] = useState(0);
  const displayedRef = useRef(0);
  const arcRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === null) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      displayedRef.current = 0;
      arcRef.current = 0;
      setDisplayedPct(0);
      setArcPct(0);
      return;
    }

    const from = displayedRef.current;
    const fromArc = arcRef.current;
    const to = targetPct;
    const duration = 700;
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || (from === to && fromArc === to)) {
      displayedRef.current = to;
      arcRef.current = to;
      setDisplayedPct(to);
      setArcPct(to);
      return;
    }

    let start: number | null = null;

    const step = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / duration);

      const nextPct = from + (to - from) * easeOutCubic(t);
      const nextArcRaw = fromArc + (to - fromArc) * easeOutBack(t);
      const nextArc = Math.min(100, Math.max(0, nextArcRaw));

      displayedRef.current = nextPct;
      arcRef.current = nextArc;
      setDisplayedPct(nextPct);
      setArcPct(nextArc);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        displayedRef.current = to;
        arcRef.current = to;
        setDisplayedPct(to);
        setArcPct(to);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [value, targetPct]);

  const end = GAUGE_START + (GAUGE_SWEEP * arcPct) / 100;

  return (
    <svg
      viewBox="0 0 100 100"
      className="h-[104px] w-[104px] shrink-0"
      role="img"
      aria-label={
        value === null ? '24 小时可用率暂无读数' : `24 小时平均可用率 ${value.toFixed(2)}%`
      }
    >
      {/* 径向刻度 */}
      {Array.from({ length: 11 }, (_, i) => {
        const deg = GAUGE_START + (GAUGE_SWEEP * i) / 10;
        const outer = polar(50, 50, 30, deg);
        const inner = polar(50, 50, i % 5 === 0 ? 23 : 26, deg);
        return (
          <line
            key={i}
            x1={outer.x.toFixed(2)}
            y1={outer.y.toFixed(2)}
            x2={inner.x.toFixed(2)}
            y2={inner.y.toFixed(2)}
            className="stroke-line-strong"
            strokeWidth={1}
          />
        );
      })}

      {/* 轨道 */}
      <path
        d={arcPath(50, 50, 39, GAUGE_START, GAUGE_START + GAUGE_SWEEP)}
        fill="none"
        className="stroke-line"
        strokeWidth={1.5}
      />

      {/* 读数弧 */}
      {value !== null && arcPct > 0 && (
        <path
          d={arcPath(50, 50, 39, GAUGE_START, end)}
          fill="none"
          className="stroke-accent"
          strokeWidth={2.5}
          style={{ filter: 'drop-shadow(0 0 3px rgb(var(--c-signal) / 0.45))' }}
        />
      )}

      <text
        x={50}
        y={51}
        textAnchor="middle"
        className="fill-ink text-[19px] font-medium tnum"
      >
        {value === null ? '—' : displayedPct.toFixed(2)}
      </text>
      <text x={50} y={64} textAnchor="middle" className="fill-subtle text-[7px] tracking-label">
        24H UPTIME
      </text>
    </svg>
  );
}
