'use client';

import { useRef, useState, useEffect } from 'react';
import type { MonitorView } from '@/lib/types';
import { Sparkline } from './Sparkline';
import { UptimeTrace } from './UptimeTrace';
import { StatusDot } from './StatusDot';
import { MonitorDetail } from './MonitorDetail';

const STATE_META = {
  up: { text: '正常', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
  down: { text: '故障', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
  paused: { text: '已暂停', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  pending: { text: '待检测', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
} as const;

const RAIL_GLOW: Record<MonitorView['state'], string> = {
  up: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
  down: 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.7)]',
  paused: 'bg-slate-400',
  pending: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]',
};

function traceColorFor(state: MonitorView['state']): string {
  return state === 'down' ? 'rgb(var(--c-down))' : 'rgb(var(--c-accent))';
}

interface Props {
  monitor: MonitorView;
  timezone: string;
  showUrl: boolean;
  historyDays: number;
}

export function MonitorCard({ monitor, timezone, showUrl, historyDays }: Props) {
  const cardRef = useRef<HTMLElement>(null);
  const rafRef = useRef<number | null>(null);
  const meta = STATE_META[monitor.state];
  const live = monitor.state === 'down';
  const sslDays = monitor.sslExpires === null ? null : Math.ceil((monitor.sslExpires * 1000 - Date.now()) / 86400000);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // 仅在桌面端 (pointer: fine) 计算光标微跟随，移动端完全跳过
  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (typeof window !== 'undefined' && !window.matchMedia('(pointer: fine)').matches) return;
    if (rafRef.current !== null) return;
    const clientX = e.clientX;
    const clientY = e.clientY;

    rafRef.current = requestAnimationFrame(() => {
      const card = cardRef.current;
      if (card) {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--card-x', `${clientX - rect.left}px`);
        card.style.setProperty('--card-y', `${clientY - rect.top}px`);
      }
      rafRef.current = null;
    });
  };

  return (
    <article
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={`card group/card relative flex flex-col justify-between p-4 sm:p-5 ${
        live ? 'border-rose-500/50 shadow-glow-down' : ''
      }`}
    >
      {/* 桌面端鼠标跟随微高光层 */}
      <div
        aria-hidden
        className="pointer-events-none hidden sm:block absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-200 group-hover/card:opacity-100"
        style={{
          background: `radial-gradient(360px circle at var(--card-x, 50%) var(--card-y, 50%), rgba(56, 189, 248, 0.08), transparent 70%)`,
        }}
      />

      {/* 左侧垂直状态光导轨 */}
      <span
        aria-hidden
        className={`absolute inset-y-3 left-0 w-1 rounded-r-full transition-colors duration-300 ${RAIL_GLOW[monitor.state]}`}
      />

      <div className="space-y-4 pl-1">
        {/* 卡片头部：名称、类型标签、状态药丸、详情入口 */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <StatusDot tone={monitor.state} pulse={live} size="sm" />
              <h3 className="truncate font-sans text-sm sm:text-base font-bold tracking-tight text-ink">
                {monitor.url ? (
                  <a
                    href={monitor.url}
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-accent inline-flex items-center gap-1 group/title"
                  >
                    <span>{monitor.name}</span>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="opacity-0 -translate-x-1 group-hover/title:opacity-100 group-hover/title:translate-x-0 transition-all duration-200 text-accent"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                ) : (
                  monitor.name
                )}
              </h3>
              <span className="shrink-0 rounded-md border border-line/40 bg-surface2/60 px-1.5 py-0.5 font-mono text-[10px] text-subtle">
                {monitor.typeLabel}
              </span>
            </div>

            {showUrl && monitor.url && (
              <p className="mt-0.5 truncate font-mono text-xs text-subtle" title={monitor.url}>
                {monitor.url}
              </p>
            )}
          </div>

          {/* 详情按钮与状态标签：加大触控区域与 touch-manipulation */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDetailOpen(true);
              }}
              aria-label={`查看 ${monitor.name} 详情`}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line/60 bg-surface2 px-3 py-1 font-sans text-xs font-semibold text-ink transition-all hover:border-line-strong active:scale-95 cursor-pointer touch-manipulation shadow-sm"
            >
              <span>详情</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>

            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-xs font-medium ${meta.color}`}
            >
              {meta.text}
            </span>
          </div>
        </div>

        {/* 90 天可用性微缩迹线 */}
        <div>
          <div className="mb-1 flex items-center justify-between font-mono text-xs text-subtle">
            <span>最近 {historyDays} 天</span>
            <span className="font-semibold text-ink">{fmtRatio(monitor.uptime.all)}%</span>
          </div>
          <UptimeTrace days={monitor.days} timezone={timezone} height={38} />
        </div>

        {/* 4 宫格遥测指标卡 */}
        <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-line/40 bg-surface2/30 p-1.5">
          <MetricCell label="24h" value={fmtRatio(monitor.uptime.d1)} unit="%" />
          <MetricCell label="7d" value={fmtRatio(monitor.uptime.d7)} unit="%" />
          <MetricCell label="30d" value={fmtRatio(monitor.uptime.d30)} unit="%" />
          <MetricCell
            label="延迟"
            value={monitor.avgResponseMs !== null ? String(Math.round(monitor.avgResponseMs)) : '-'}
            unit="ms"
          />
        </div>

        {/* 响应时间趋势 (Smooth Sparkline) */}
        <div>
          <div className="mb-1 flex items-baseline justify-between font-mono text-xs text-subtle">
            <span>响应延迟走势</span>
            <span className="font-medium text-ink">
              {monitor.lastResponseMs !== null ? `${Math.round(monitor.lastResponseMs)}ms` : '—'}
            </span>
          </div>
          <Sparkline
            values={monitor.responseSeries.map((p) => p.v)}
            color={traceColorFor(monitor.state)}
            height={30}
          />
        </div>

        {/* SSL 证书到期状态栏 */}
        {sslDays !== null && (
          <div className="border-t border-line/30 pt-2">
            <div className="mb-1 flex items-center justify-between font-mono text-[11px] text-subtle">
              <span className="flex items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                SSL 证书安全
              </span>
              <span
                suppressHydrationWarning
                className={`font-medium ${
                  sslDays < 7 ? 'text-rose-500' : sslDays < 15 ? 'text-amber-500' : 'text-emerald-500'
                }`}
              >
                {sslDays < 0 ? '已到期' : `${sslDays} 天后更新`}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface2">
              <div
                className={`h-full rounded-full transition-[width] duration-300 ease-out ${
                  sslDays < 7
                    ? 'bg-rose-500'
                    : sslDays < 15
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{
                  width: `${sslDays < 0 ? 100 : Math.min(100, Math.max(4, Math.round((sslDays / 90) * 100)))}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      <MonitorDetail
        monitor={monitor}
        timezone={timezone}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </article>
  );
}

function MetricCell({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-lg bg-surface/75 px-1 sm:px-2 py-1 text-center">
      <div className="font-mono text-[10px] text-subtle">{label}</div>
      <div className="mt-0.5 font-mono text-xs font-semibold leading-none text-ink tnum truncate">
        {value}
        <span className="ml-0.5 font-normal text-subtle text-[10px]">{unit}</span>
      </div>
    </div>
  );
}

function fmtRatio(v: number | null): string {
  return v === null ? '—' : v.toFixed(v === 100 ? 0 : 2);
}
