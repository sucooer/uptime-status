'use client';

import { useEffect, useRef } from 'react';
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

/** 面板内可聚焦元素选择器 */
const FOCUSABLE_SELECTOR = 'button, [href], input, [tabindex]:not([tabindex="-1"])';

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
};

export function MonitorDetail({ monitor, timezone, open, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // ① 记录打开前的焦点 → 聚焦关闭按钮 → 关闭时恢复焦点
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      previous?.focus?.();
    };
  }, [open]);

  // ③ Escape 关闭
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

  // ⑤ 打开时锁定页面滚动，关闭后恢复
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // ④ Tab 焦点陷阱（面板内首尾循环）
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

  if (!open) return null;


  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="关闭详情"
        onClick={onClose}
        className="drawer-fade absolute inset-0 h-full w-full cursor-default bg-black/60"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${monitor.name} 详情`}
        onKeyDown={handlePanelKeyDown}
        className="drawer-slide absolute right-0 top-0 flex h-full w-[min(92vw,560px)] flex-col overflow-y-auto border-l border-line-strong bg-surface"
      >
        <div className="flex items-start justify-between gap-3 border-b divider px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold leading-tight">{monitor.name}</h2>
              <span className="chip border-line text-subtle">{monitor.typeLabel}</span>
            </div>
            {monitor.url && (
              <a
                href={monitor.url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block truncate font-mono text-2xs text-subtle hover:text-accent"
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
            className="ctl h-9 shrink-0 px-3 font-mono text-2xs uppercase tracking-wider"
          >
            关闭
          </button>
        </div>

        <div className="space-y-6 px-5 py-5">
          <section>
            <p className="eyebrow mb-2">90 天可用率</p>
            <UptimeTrace days={monitor.days} timezone={timezone} height={96} inspectable />
          </section>

          <section>
            <p className="eyebrow mb-2">响应时间</p>
            <Sparkline values={monitor.responseSeries.map((p) => p.v)} height={64} />
            <p className="mt-2 font-mono text-2xs tnum text-subtle">
              平均{' '}
              {monitor.avgResponseMs !== null ? `${Math.round(monitor.avgResponseMs)}ms` : '—'} · 最近{' '}
              {monitor.lastResponseMs !== null ? `${Math.round(monitor.lastResponseMs)}ms` : '—'}
            </p>
          </section>

          <section>
            <p className="eyebrow mb-2">元数据</p>
            <dl className="grid grid-cols-2 gap-3 font-mono text-2xs">
              <div>
                <dt className="uppercase tracking-wider text-subtle">检测间隔</dt>
                <dd className="mt-0.5 tnum text-ink2">{monitor.interval} 秒</dd>
              </div>
              <div>
                <dt className="uppercase tracking-wider text-subtle">SSL 到期</dt>
                <dd className="mt-0.5 tnum text-ink2">
                  {monitor.sslExpires !== null
                    ? formatTime(monitor.sslExpires * 1000, timezone, DATE_OPTIONS)
                    : '无'}
                </dd>
              </div>
              <div>
                <dt className="uppercase tracking-wider text-subtle">创建时间</dt>
                <dd className="mt-0.5 tnum text-ink2">
                  {monitor.createdAt > 0
                    ? formatTime(monitor.createdAt * 1000, timezone, DATE_OPTIONS)
                    : '未知'}
                </dd>
              </div>
              <div>
                <dt className="uppercase tracking-wider text-subtle">90 天可用率</dt>
                <dd className="mt-0.5 tnum text-ink2">
                  {monitor.uptime.all !== null ? `${monitor.uptime.all.toFixed(2)}%` : '—'}
                </dd>
              </div>
            </dl>
          </section>

          <section>
            <p className="eyebrow mb-2">事件记录（{monitor.incidents.length}）</p>
            {monitor.incidents.length === 0 ? (
              <p className="text-sm text-ink2">窗口内无事件记录。</p>
            ) : (
              <ul className="space-y-3">
                {monitor.incidents.map((inc) => {
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
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
