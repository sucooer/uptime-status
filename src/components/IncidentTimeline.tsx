'use client';

import { useState } from 'react';

import { ReasonLine } from '@/components/ReasonLine';
import { formatDuration, formatTime } from '@/lib/time';
import type { Incident } from '@/lib/types';

interface Props {
  incidents: Incident[];
  timezone: string;
  now: number;
}

export function IncidentTimeline({ incidents, timezone, now }: Props) {
  const [open, setOpen] = useState<number | null>(null);

  if (incidents.length === 0) return null;

  const rows = incidents.slice(0, 20);

  const windowStart = Math.min(...rows.map((inc) => inc.start * 1000));
  const endedTimes = rows
    .map((inc) => (inc.end === null ? null : inc.end * 1000))
    .filter((ms): ms is number => ms !== null);
  let windowEnd = Math.max(now, ...endedTimes);
  if (windowEnd <= windowStart) {
    windowEnd = windowStart + 3600_000;
  }

  const pct = (ms: number) =>
    (((ms - windowStart) / (windowEnd - windowStart)) * 100).toFixed(2);

  return (
    <div className="card mb-4 px-4 py-4">
      <div className="flex items-center justify-between">
        <span className="eyebrow">事件时间轴 / TIMELINE</span>
        <span className="font-mono text-2xs tnum text-subtle">
          {formatTime(windowStart, timezone, { month: '2-digit', day: '2-digit' })} –{' '}
          {formatTime(windowEnd, timezone, { month: '2-digit', day: '2-digit' })}
        </span>
      </div>

      <div aria-hidden className="mt-3 h-px bg-line" />

      {rows.map((inc, idx) => {
        const active = !inc.end;
        const startMs = inc.start * 1000;
        const endMs = inc.end ? inc.end * 1000 : now;
        const left = pct(startMs);
        const width = Math.max(0.6, Number(pct(endMs)) - Number(pct(startMs)));
        const expanded = open === idx;

        return (
          <div key={`${inc.monitorId}-${inc.start}`} className="border-b divider last:border-b-0">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? null : idx)}
              className="flex w-full items-center gap-3 py-2.5 text-left"
            >
              <span className="w-28 shrink-0 truncate text-sm font-medium">{inc.monitorName}</span>
              <span className="relative h-5 min-w-0 flex-1">
                <span
                  className={`absolute top-1/2 h-[3px] -translate-y-1/2 ${active ? 'bg-down' : 'bg-degraded'}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              </span>
              <span className="shrink-0 font-mono text-2xs tnum text-subtle">
                {active ? '持续中' : formatDuration(inc.durationSeconds ?? 0)}
              </span>
            </button>

            {expanded && (
              <div className="pb-3" style={{ paddingLeft: '7rem' }}>
                <span className="font-mono text-2xs tnum text-subtle">
                  {formatTime(inc.start * 1000, timezone)}
                  {inc.end
                    ? ` – ${formatTime(inc.end * 1000, timezone, {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })}`
                    : ''}
                </span>
                <ReasonLine incident={inc} active={active} className="mt-1" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
