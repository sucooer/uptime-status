'use client';

import { useState } from 'react';
import type { MonitorGroupView, MonitorState } from '@/lib/types';
import { MonitorCard } from './MonitorCard';

interface Props {
  groups: MonitorGroupView[];
  timezone: string;
  showUrl: boolean;
  historyDays: number;
}

type Filter = 'all' | MonitorState;

const FILTERS: ReadonlyArray<{ value: Filter; label: string; dot?: string }> = [
  { value: 'all', label: '全部' },
  { value: 'up', label: '正常', dot: 'bg-emerald-500' },
  { value: 'down', label: '故障', dot: 'bg-rose-500' },
  { value: 'paused', label: '已暂停', dot: 'bg-slate-400' },
  { value: 'pending', label: '待检测', dot: 'bg-amber-400' },
];

export function MonitorGrid({ groups, timezone, showUrl, historyDays }: Props) {
  const [filter, setFilter] = useState<Filter>('all');

  const allMonitors = groups.flatMap((g) => g.monitors);
  const count = (f: Filter): number =>
    f === 'all' ? allMonitors.length : allMonitors.filter((m) => m.state === f).length;

  const visibleGroups = groups
    .map((group) => ({
      group,
      filtered: group.monitors.filter((m) => filter === 'all' || m.state === filter),
    }))
    .filter(({ filtered }) => filtered.length > 0);

  return (
    <div id="monitor-groups" className="mt-8 space-y-7">
      {/* 现代流体胶囊筛选栏：支持移动端横向平滑滚动 (No-Scrollbar Horizontal Swipe) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          className="inline-flex max-w-full items-center gap-1 overflow-x-auto no-scrollbar rounded-full border border-line/60 bg-surface/80 p-1 shadow-sm touch-pan-x"
          role="group"
          aria-label="按状态筛选"
        >
          {FILTERS.map(({ value, label, dot }) => {
            const active = filter === value;
            const c = count(value);
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(value)}
                className={`relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-sans text-xs font-semibold transition-all duration-200 cursor-pointer touch-manipulation ${
                  active
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-subtle hover:bg-surface2 hover:text-ink'
                }`}
              >
                {dot && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      active ? 'bg-white' : dot
                    }`}
                  />
                )}
                <span>{label}</span>
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.2 font-mono text-[10px] leading-tight ${
                    active ? 'bg-white/20 text-white' : 'bg-surface2 text-subtle'
                  }`}
                >
                  {c}
                </span>
              </button>
            );
          })}
        </div>

        <div className="font-mono text-xs text-subtle hidden sm:block">
          共 <span className="font-semibold text-ink">{allMonitors.length}</span> 个监控端点
        </div>
      </div>

      {visibleGroups.length === 0 ? (
        <div className="card mt-6 flex flex-col items-center justify-center p-10 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface2 text-subtle">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6M9 9l6 6" />
            </svg>
          </div>
          <p className="mt-3 text-sm font-medium text-ink">当前筛选下无匹配项</p>
          <p className="mt-1 text-xs text-subtle">暂未发现符合此状态过滤条件的监控目标。</p>
        </div>
      ) : (
        visibleGroups.map(({ group, filtered }) => (
          <section key={group.name} className="space-y-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-2 font-sans text-sm font-bold text-ink">
                <span className="h-2 w-2 rounded-full bg-accent" />
                {group.name}
              </span>
              <span className="rounded-full bg-surface2 px-2 py-0.5 font-mono text-xs text-subtle">
                {filtered.length}
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-line/60 via-line/20 to-transparent" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map((m) => (
                <div key={m.id}>
                  <MonitorCard
                    monitor={m}
                    timezone={timezone}
                    showUrl={showUrl}
                    historyDays={historyDays}
                  />
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
