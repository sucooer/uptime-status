'use client';

import { useEffect, useState } from 'react';
import type { MonitorView } from '@/lib/types';
import { Sparkline } from './Sparkline';
import { UptimeTrace } from './UptimeTrace';
import { ReasonLine } from './ReasonLine';
import { StatusDot } from './StatusDot';
import { HudButton } from './HudButton';
import { MonitorDetail } from './MonitorDetail';
import { formatDuration, formatTime } from '@/lib/time';

const RAIL: Record<MonitorView['state'], string> = {
  up: 'bg-up',
  down: 'bg-down',
  paused: 'bg-line-strong',
  pending: 'bg-degraded',
};

const STATE_META = {
  up: { text: '正常' },
  down: { text: '故障' },
  paused: { text: '已暂停' },
  pending: { text: '待检测' },
} as const;

type ChipState = {
  prev: MonitorView['state'];
  current: MonitorView['state'];
  exiting: boolean;
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
  const meta = STATE_META[monitor.state];
  const live = monitor.state === 'down';
  // SSL 到期倒计时：90 天为参考有效期（进度条宽度按此换算）
  const sslDays = monitor.sslExpires === null ? null : Math.ceil((monitor.sslExpires * 1000 - Date.now()) / 86400000);

  const [chipAnim, setChipAnim] = useState<ChipState>({
    prev: monitor.state,
    current: monitor.state,
    exiting: false,
  });
  const [detailOpen, setDetailOpen] = useState(false);

  if (monitor.state !== chipAnim.current) {
    setChipAnim({
      prev: chipAnim.current,
      current: monitor.state,
      exiting: true,
    });
  }

  useEffect(() => {
    if (!chipAnim.exiting) return;

    const timer = setTimeout(() => {
      setChipAnim((prev) => ({ ...prev, exiting: false }));
    }, 450); // 450ms 需覆盖 420ms 的导轨充能/边框闪色动画，避免动效被提前截断

    return () => clearTimeout(timer);
  }, [chipAnim.exiting, chipAnim.current]);

  return (
    <article
      className={`card relative py-3.5 pl-4 pr-4 transition-colors hover:border-line-strong ${
        live ? 'border-down/45' : ''
      } ${chipAnim.exiting && chipAnim.prev !== chipAnim.current ? 'state-flash' : ''}`}
    >
      {/* 左侧状态导轨：一眼扫过整列就能看出谁出了问题 */}
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-[3px] overflow-hidden ${RAIL[monitor.state]}`}
      >
        {chipAnim.exiting && chipAnim.prev !== chipAnim.current && (
          <span
            key={`${chipAnim.prev}-${chipAnim.current}`}
            aria-hidden
            className="rail-charge absolute inset-0 bg-white/60"
          />
        )}
      </span>

      {/* 标题行 */}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {live && <StatusDot tone="down" pulse />}
            <h3 className="truncate text-[15px] font-semibold leading-snug">
              {monitor.url ? (
                <a
                  href={monitor.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block transition-[color,transform] hover:text-accent active:scale-[0.96]"
                >
                  {monitor.name}
                </a>
              ) : (
                monitor.name
              )}
            </h3>
            <span className="chip shrink-0 border-line text-subtle">{monitor.typeLabel}</span>
          </div>
          {showUrl && monitor.url && (
            <p className="mt-1 truncate font-mono text-2xs text-subtle" title={monitor.url}>
              {monitor.url}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <HudButton
            onClick={() => setDetailOpen(true)}
            aria-label={`查看 ${monitor.name} 详情`}
            className="h-7 px-2 font-mono text-2xs uppercase tracking-wider"
          >
            详情
          </HudButton>
          <span className="relative inline-flex shrink-0">
          {chipAnim.exiting && chipAnim.prev !== chipAnim.current && (
            <span
              key={`exit-${chipAnim.prev}-${chipAnim.current}`}
              aria-hidden
              className="chip chip-state-exit pointer-events-none absolute left-0 top-0"
              data-state={chipAnim.prev}
            >
              {STATE_META[chipAnim.prev].text}
            </span>
          )}
          <span
            key={monitor.state}
            className={`chip shrink-0 ${chipAnim.exiting ? 'chip-state-enter' : ''}`}
            data-state={monitor.state}
          >
            {meta.text}
          </span>
          </span>
        </div>
      </div>

      {/* 迹线 */}
      <div className="mt-3.5">
        <div className="mb-1.5 flex items-center justify-between font-mono text-2xs uppercase tracking-wider text-subtle">
          <span>最近 {historyDays} 天</span>
          <span className="tnum">{fmtRatio(monitor.uptime.all)}%</span>
        </div>
        <UptimeTrace days={monitor.days} timezone={timezone} height={48} />
      </div>

      {/* 指标：发丝分隔的等宽读数格 */}
      <div className="mt-3.5 grid grid-cols-4 gap-px border border-line bg-line">
        <Metric label="24h" value={fmtRatio(monitor.uptime.d1)} unit="%" />
        <Metric label="7d" value={fmtRatio(monitor.uptime.d7)} unit="%" />
        <Metric label="30d" value={fmtRatio(monitor.uptime.d30)} unit="%" />
        <Metric
          label="响应"
          value={monitor.avgResponseMs !== null ? String(Math.round(monitor.avgResponseMs)) : '-'}
          unit="ms"
        />
      </div>

      {/* 响应时间 */}
      <div className="mt-3.5">
        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 font-mono text-2xs uppercase tracking-wider text-subtle">
          <span>响应时间</span>
          <span className="tnum">
            {monitor.lastResponseMs !== null ? `${Math.round(monitor.lastResponseMs)}ms` : '—'}
          </span>
        </div>
        <Sparkline
          values={monitor.responseSeries.map((p) => p.v)}
          color={traceColorFor(monitor.state)}
          height={32}
        />
      </div>

      {sslDays !== null && (
        <div className="mt-3.5">
          <div className="mb-1.5 flex items-baseline justify-between font-mono text-2xs uppercase tracking-wider text-subtle">
            <span>SSL 证书</span>
            <span suppressHydrationWarning className={sslDays < 7 ? 'text-down' : sslDays < 14 ? 'text-degraded' : 'text-subtle'}>
              {sslDays < 0 ? '已过期' : `${sslDays} 天后到期`}
            </span>
          </div>
          <div className="h-[3px] bg-line">
            <div className={`h-full ${sslDays < 7 ? 'bg-down' : sslDays < 14 ? 'bg-degraded' : 'bg-accent'}`} style={{ width: `${sslDays < 0 ? 100 : Math.min(100, Math.max(2, Math.round((sslDays / 90) * 100)))}%` }} />
          </div>
        </div>
      )}

      {/* 事件记录 */}
      {monitor.incidents.length > 0 && (
        <details className="group mt-3.5 border-t divider pt-2.5">
          <summary className="cursor-pointer list-none font-mono text-2xs uppercase tracking-wider text-accent transition-transform hover:underline active:scale-[0.96]">
            <span className="group-open:hidden">
              展开 {Math.min(monitor.incidents.length, 5)} 次事件
            </span>
            <span className="hidden group-open:inline">收起</span>
          </summary>
          <ul className="mt-2.5 space-y-2.5">
            {monitor.incidents.slice(0, 5).map((inc) => {
              const active = !inc.end;
              return (
                <li
                  key={`${inc.start}-${inc.end ?? 'now'}`}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-2xs tnum text-subtle">
                      {formatTime(inc.start * 1000, timezone)}
                      {inc.end
                        ? ` – ${formatTime(inc.end * 1000, timezone, { hour: '2-digit', minute: '2-digit', hour12: false })}`
                        : ''}
                    </div>
                    <ReasonLine incident={inc} active={active} className="mt-1" />
                  </div>
                  <span
                    className={`shrink-0 font-mono text-2xs uppercase tracking-wider ${
                      active ? 'text-down' : 'text-subtle'
                    }`}
                  >
                    {active ? '持续中' : formatDuration(inc.durationSeconds ?? 0)}
                  </span>
                </li>
              );
            })}
          </ul>
        </details>
      )}
      <MonitorDetail
        monitor={monitor}
        timezone={timezone}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </article>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-surface px-2 py-1.5">
      <div className="font-mono text-2xs uppercase tracking-wider text-subtle">{label}</div>
      <div className="mt-0.5 font-mono text-xs font-semibold leading-none tnum">
        <span key={value} className="metric-swap">{value}</span>
        <span className="ml-0.5 text-2xs font-normal text-subtle">{unit}</span>
      </div>
    </div>
  );
}

function fmtRatio(v: number | null): string {
  return v === null ? '—' : v.toFixed(v === 100 ? 0 : 2);
}
