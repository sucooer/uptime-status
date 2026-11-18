import type { DayCell } from './types';

/** 把所有监控项按天合并成一条全局状态迹线 */
export function mergeDays(groups: { monitors: { days: DayCell[] }[] }[], historyDays: number): DayCell[] {
  const all: DayCell[][] = [];
  for (const g of groups) for (const m of g.monitors) if (m.days.length) all.push(m.days);
  if (!all.length) return [];

  const len = Math.min(historyDays, Math.max(...all.map((d) => d.length)));
  const out: DayCell[] = [];
  for (let i = 0; i < len; i++) {
    const cells = all.map((arr) => arr[arr.length - len + i]).filter(Boolean);
    let state: DayCell['state'] = 'nodata';
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
