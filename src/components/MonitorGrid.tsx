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

const FILTERS: ReadonlyArray<{ value: Filter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'up', label: '正常' },
  { value: 'down', label: '故障' },
  { value: 'paused', label: '已暂停' },
  { value: 'pending', label: '待检测' },
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
    <div id="monitor-groups">
      <div className="mt-10 flex flex-wrap items-center gap-2" role="group" aria-label="按状态筛选">
        {FILTERS.map(({ value, label }) => {
          const active = filter === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(value)}
              className={`chip ${active ? 'border-accent text-accent' : 'border-line text-subtle'}`}
            >
              {label} [{count(value)}]
            </button>
          );
        })}
      </div>

      {visibleGroups.length === 0 ? (
        <div className="card mt-10 px-4 py-6 text-center">
          <p className="eyebrow">无匹配项</p>
          <p className="mt-1.5 text-sm text-ink2">该状态下暂无监控项。</p>
        </div>
      ) : (
        visibleGroups.map(({ group, filtered }) => (
          <section key={group.name} className="mt-10">
            <h3 className="mb-3 flex items-center gap-3">
              <span className="eyebrow text-accent">{group.name}</span>
              <span className="font-mono text-2xs tnum text-subtle">[{filtered.length}]</span>
              <span aria-hidden className="rule flex-1" />
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map((m, idx) => (
                <div key={m.id} className={`animate-enter ${idx < 5 ? `stagger-${idx + 1}` : ''}`}>
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
