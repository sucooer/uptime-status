import type { Incident } from '@/lib/types';
import { ReasonLine } from './ReasonLine';
import { formatDuration, formatTime } from '@/lib/time';

interface Props {
  incidents: Incident[];
  timezone: string;
  historyDays: number;
}

export function IncidentList({ incidents, timezone, historyDays }: Props) {
  if (!incidents.length) {
    return (
      <div className="card px-5 py-6 text-center">
        <p className="font-mono text-2xs uppercase tracking-label text-subtle">无记录</p>
        <p className="mt-1.5 text-sm text-ink2">最近 {historyDays} 天内没有服务中断。</p>
      </div>
    );
  }

  return (
    <div className="card divide-y divide-line overflow-hidden">
      {incidents.slice(0, 10).map((inc) => {
        const active = !inc.end;
        return (
          <div
            key={`${inc.monitorId}-${inc.start}`}
            className="flex items-start justify-between gap-3 px-5 py-3.5"
          >
            <div className="flex min-w-0 items-start gap-3">
              {/* 竖条刻度，与卡片左侧导轨同一套语言：红=在故障中，琥珀=已恢复 */}
              <span
                aria-hidden
                className={`mt-0.5 h-3.5 w-[3px] shrink-0 rounded-sm ${active ? 'bg-down' : 'bg-degraded'}`}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-sm font-medium">{inc.monitorName}</span>
                  <span className="rounded border border-line px-1.5 py-px font-mono text-2xs uppercase tracking-wider text-subtle">
                    {inc.monitorType}
                  </span>
                  <span className="font-mono text-2xs tnum text-subtle">
                    {formatTime(inc.start * 1000, timezone)}
                    {inc.end
                      ? ` – ${formatTime(inc.end * 1000, timezone, { hour: '2-digit', minute: '2-digit', hour12: false })}`
                      : ''}
                  </span>
                </div>
                <ReasonLine incident={inc} active={active} className="mt-1.5" />
              </div>
            </div>
            <span
              className={`shrink-0 font-mono text-2xs uppercase tracking-wider ${
                active ? 'text-down' : 'text-subtle'
              }`}
            >
              {active ? '持续中' : `中断 ${formatDuration(inc.durationSeconds ?? 0)}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
