'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { MonitorView } from '@/lib/types';
import { formatDuration, formatTime } from '@/lib/time';
import { ReasonLine } from './ReasonLine';
import { Sparkline } from './Sparkline';
import { UptimeTrace } from './UptimeTrace';

interface Props {
  monitor: MonitorView;
  timezone: string;
  open: boolean;
  onClose: () => void;
}

const FOCUSABLE_SELECTOR = 'button, [href], input, [tabindex]:not([tabindex="-1"])';

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
};

export function MonitorDetail({ monitor, timezone, open, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      previous?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handlePanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;

    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!first || !last) {
      event.preventDefault();
      return;
    }

    const current = document.activeElement;
    if (event.shiftKey) {
      if (current === first || !panel.contains(current)) {
        event.preventDefault();
        last.focus();
      }
    } else if (current === last || !panel.contains(current)) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* 磨砂背景蒙版 */}
      <button
        type="button"
        aria-label="关闭详情"
        onClick={onClose}
        className="drawer-fade absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm"
      />

      {/* 现代极简流体抽屉面板 */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${monitor.name} 详情`}
        onKeyDown={handlePanelKeyDown}
        className="drawer-slide relative z-10 flex h-full w-[min(92vw,580px)] flex-col overflow-y-auto border-l border-white/10 dark:border-white/10 border-black/5 bg-surface/95 shadow-2xl backdrop-blur-2xl"
      >
        {/* 顶部标题栏 */}
        <div className="flex items-start justify-between gap-4 border-b border-line/40 px-6 py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h2 className="truncate font-sans text-lg font-semibold tracking-tight text-ink">
                {monitor.name}
              </h2>
              <span className="rounded-md border border-line/50 bg-surface2 px-2 py-0.5 font-mono text-xs text-subtle">
                {monitor.typeLabel}
              </span>
            </div>
            {monitor.url && (
              <a
                href={monitor.url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block truncate font-mono text-xs text-subtle transition-colors hover:text-accent"
              >
                {monitor.url}
              </a>
            )}
          </div>

          <button
            type="button"
            ref={closeRef}
            onClick={onClose}
            aria-label="关闭详情"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line/50 bg-surface2 text-subtle transition-all hover:bg-surface hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 抽屉内容区 */}
        <div className="space-y-6 px-6 py-6">
          {/* 90 天可用率迹线 */}
          <section className="rounded-2xl border border-line/40 bg-surface2/30 p-4">
            <div className="mb-3 flex items-center justify-between font-mono text-xs text-subtle">
              <span className="font-semibold text-ink">90 天可用率全景</span>
              <span>
                {monitor.uptime.all !== null ? `${monitor.uptime.all.toFixed(2)}%` : '—'}
              </span>
            </div>
            <UptimeTrace days={monitor.days} timezone={timezone} height={96} inspectable />
          </section>

          {/* 响应时间趋势 */}
          <section className="rounded-2xl border border-line/40 bg-surface2/30 p-4">
            <div className="mb-2 flex items-center justify-between font-mono text-xs text-subtle">
              <span className="font-semibold text-ink">响应时间分布</span>
              <span className="tnum">
                平均{' '}
                <span className="font-medium text-ink">
                  {monitor.avgResponseMs !== null ? `${Math.round(monitor.avgResponseMs)}ms` : '—'}
                </span>
                {' · '}最近{' '}
                <span className="font-medium text-ink">
                  {monitor.lastResponseMs !== null ? `${Math.round(monitor.lastResponseMs)}ms` : '—'}
                </span>
              </span>
            </div>
            <Sparkline values={monitor.responseSeries.map((p) => p.v)} height={64} />
          </section>

          {/* 元数据 */}
          <section className="rounded-2xl border border-line/40 bg-surface2/30 p-4">
            <p className="mb-3 font-mono text-xs uppercase tracking-wider text-subtle font-medium">服务配置与安全属性</p>
            <dl className="grid grid-cols-2 gap-4 font-mono text-xs">
              <div className="rounded-xl bg-surface/60 p-3">
                <dt className="text-subtle">检测频率间隔</dt>
                <dd className="mt-1 text-sm font-semibold text-ink tnum">{monitor.interval} 秒</dd>
              </div>
              <div className="rounded-xl bg-surface/60 p-3">
                <dt className="text-subtle">SSL 证书到期日</dt>
                <dd className="mt-1 text-sm font-semibold text-ink tnum">
                  {monitor.sslExpires !== null
                    ? formatTime(monitor.sslExpires * 1000, timezone, DATE_OPTIONS)
                    : '未配置'}
                </dd>
              </div>
              <div className="rounded-xl bg-surface/60 p-3">
                <dt className="text-subtle">首次加入监控</dt>
                <dd className="mt-1 text-sm font-semibold text-ink tnum">
                  {monitor.createdAt > 0
                    ? formatTime(monitor.createdAt * 1000, timezone, DATE_OPTIONS)
                    : '未知'}
                </dd>
              </div>
              <div className="rounded-xl bg-surface/60 p-3">
                <dt className="text-subtle">历史总可用率</dt>
                <dd className="mt-1 text-sm font-semibold text-ink tnum">
                  {monitor.uptime.all !== null ? `${monitor.uptime.all.toFixed(2)}%` : '—'}
                </dd>
              </div>
            </dl>
          </section>

          {/* 近期事件时间线 */}
          <section className="rounded-2xl border border-line/40 bg-surface2/30 p-4">
            <p className="mb-3 font-mono text-xs uppercase tracking-wider text-subtle font-medium">
              近期事件记录 ({monitor.incidents.length})
            </p>
            {monitor.incidents.length === 0 ? (
              <div className="py-6 text-center text-xs text-subtle">
                在当前观测窗口内无故障记录，服务保持稳定。
              </div>
            ) : (
              <ul className="space-y-3.5">
                {monitor.incidents.map((inc) => {
                  const active = !inc.end;
                  return (
                    <li
                      key={`${inc.start}-${inc.end ?? 'now'}`}
                      className="flex items-start justify-between gap-3 rounded-xl border border-line/30 bg-surface/50 p-3"
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-xs text-subtle">
                          {formatTime(inc.start * 1000, timezone)}
                          {inc.end
                            ? ` – ${formatTime(inc.end * 1000, timezone, { hour: '2-digit', minute: '2-digit', hour12: false })}`
                            : ''}
                        </div>
                        <ReasonLine incident={inc} active={active} className="mt-1.5" />
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] font-medium ${
                          active
                            ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            : 'bg-surface2 text-subtle'
                        }`}
                      >
                        {active ? '故障持续中' : formatDuration(inc.durationSeconds ?? 0)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
