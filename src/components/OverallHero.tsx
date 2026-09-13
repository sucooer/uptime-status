import type { DayCell, DayState, OverallState, StatusStats } from '@/lib/types';
import { UptimeTrace, UptimeLegend } from './UptimeTrace';

const HERO: Record<OverallState, { title: string; desc: string; tone: string }> = {
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
    tone: 'paused',
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
  const live = overall === 'down';

  return (
    <section className="card overflow-hidden">
      <div className="grid gap-0 sm:grid-cols-[1.5fr_minmax(0,1fr)]">
        {/* 状态结论 */}
        <div className="px-5 py-6 sm:px-7 sm:py-7">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              {live && (
                <span className="absolute inline-flex h-full w-full animate-pulseRing rounded-full bg-down" />
              )}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  h.tone === 'up'
                    ? 'bg-up'
                    : h.tone === 'degraded'
                      ? 'bg-degraded'
                      : h.tone === 'down'
                        ? 'bg-down'
                        : 'bg-line-strong'
                }`}
              />
            </span>
            <span className="eyebrow">当前状态</span>
          </div>

          <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-tight sm:text-[28px]">
            {h.title}
          </h1>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink2">{h.desc}</p>
        </div>

        {/* 仪表读数：纵向排布，等宽数字对齐 */}
        <dl className="grid grid-cols-2 border-t divider sm:grid-cols-1 sm:border-l sm:border-t-0">
          <Readout label="监控项" value={String(stats.total)} />
          <Readout label="正常" value={String(stats.up)} tone="up" />
          <Readout label="异常" value={String(stats.down)} tone={stats.down > 0 ? 'down' : 'none'} />
          <Readout
            label="24h 可用率"
            value={stats.avgUptime24h !== null ? stats.avgUptime24h.toFixed(2) : '-'}
            unit="%"
          />
        </dl>
      </div>

      {/* 迹线：本页的签名元素 */}
      {days.length > 0 && (
        <div className="border-t divider px-5 py-5 sm:px-7">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
            <span className="eyebrow">最近 {historyDays} 天记录</span>
            <UptimeLegend />
          </div>
          <UptimeTrace days={days} timezone={timezone} height={92} />
          <div className="mt-2 flex items-center justify-between font-mono text-2xs uppercase tracking-wider text-subtle">
            <span>{historyDays} 天前</span>
            <span>今天</span>
          </div>
        </div>
      )}
    </section>
  );
}

function Readout({
  label,
  value,
  unit,
  tone = 'none',
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: 'up' | 'down' | 'none';
}) {
  const color = tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-ink';
  return (
    <div className="flex items-baseline justify-between gap-3 border-b divider px-5 py-3 sm:border-b sm:last:border-b-0">
      <dt className="eyebrow">{label}</dt>
      <dd className={`font-mono text-xl font-semibold leading-none tnum ${color}`}>
        {value}
        {unit && <span className="ml-0.5 text-xs font-normal text-subtle">{unit}</span>}
      </dd>
    </div>
  );
}

/** 把所有监控项按天合并成一条全局状态迹线 */
export function mergeDays(groups: { monitors: { days: DayCell[] }[] }[], historyDays: number): DayCell[] {
  const all: DayCell[][] = [];
  for (const g of groups) for (const m of g.monitors) if (m.days.length) all.push(m.days);
  if (!all.length) return [];

  const len = Math.min(historyDays, Math.max(...all.map((d) => d.length)));
  const out: DayCell[] = [];
  for (let i = 0; i < len; i++) {
    const cells = all.map((arr) => arr[arr.length - len + i]).filter(Boolean);
    let state: DayState = 'nodata';
    let downSeconds = 0;
    let hasData = false;
    for (const c of cells) {
      if (c.state !== 'nodata') hasData = true;
      downSeconds = Math.max(downSeconds, c.downSeconds);
      if (c.state === 'down') state = 'down';
      else if (c.state === 'degraded' && state !== 'down') state = 'degraded';
      else if (c.state === 'up' && state === 'nodata') state = 'up';
    }
    out.push({
      start: cells[0].start,
      state: hasData ? state : 'nodata',
      downSeconds,
      uptime: cells.reduce((a, c) => a + (c.uptime ?? 0), 0) / cells.length,
    });
  }
  return out;
}
