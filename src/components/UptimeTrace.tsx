import type { DayCell, DayState } from '@/lib/types';
import { formatTime } from '@/lib/time';

const FILL: Record<DayState, string> = {
  up: 'fill-up',
  degraded: 'fill-degraded',
  down: 'fill-down',
  nodata: 'fill-line-strong',
};

const SWATCH: Record<DayState, string> = {
  up: 'bg-up',
  degraded: 'bg-degraded',
  down: 'bg-down',
  nodata: 'bg-line-strong',
};

const LABEL: Record<DayState, string> = {
  up: '正常',
  degraded: '波动',
  down: '中断',
  nodata: '无数据',
};

interface Props {
  days: DayCell[];
  timezone: string;
  /** 图形高度（px），卡片里用 54，总览用 92 */
  height?: number;
}

/**
 * 90 天「走纸记录仪」迹线 —— 本页的签名元素。
 *
 * 与健康状态页常见的等高方块条不同，这条迹线只在出事的日子立起尖峰，
 * 尖峰高度按中断时长的平方根缩放：平稳 = 一条近乎平直的基线，
 * 一眼就能看出「什么时候出过事、有多严重」。
 */
export function UptimeTrace({ days, timezone, height = 92 }: Props) {
  if (!days.length) return null;

  const W = days.length * 10;
  const H = height;
  const baseY = H - 10;
  /** 高度缩放：卡片里的紧凑版等比压扁 */
  const k = Math.max(0.35, (H - 16) / 72);
  const maxDown = Math.max(...days.map((d) => d.downSeconds), 0);

  const spikeHeight = (d: DayCell): number => {
    if (d.state === 'nodata') return 2;
    if (d.state === 'up') return 4;
    const f = maxDown > 0 ? Math.sqrt(Math.min(1, d.downSeconds / maxDown)) : 1;
    return d.state === 'down' ? 30 + f * 40 : 14 + f * 22;
  };

  const incidentCount = days.filter((d) => d.state === 'down' || d.state === 'degraded').length;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="block w-full"
      style={{ height: H }}
      role="img"
      aria-label={`最近 ${days.length} 天可用性迹线，其中 ${incidentCount} 天出现过中断或波动`}
    >
      {/* 纵向刻度：每 30 天一条发丝参考线 */}
      {days.length >= 30 &&
        Array.from({ length: Math.floor((days.length - 1) / 30) }, (_, i) => (days.length - 1) * 10 - (i + 1) * 30 * 10).map(
          (x) => (
            <rect key={`g${x}`} x={x} y={4} width={1} height={baseY - 4} className="fill-line opacity-70" />
          ),
        )}

      {/* 周刻度：基线下方的小齿 */}
      {days.map((d, i) =>
        (days.length - 1 - i) % 7 === 0 ? (
          <rect key={`t${d.start}`} x={i * 10 + 2} y={baseY + 3} width={1} height={4} className="fill-line-strong" />
        ) : null,
      )}

      {/* 基线：走纸的零位 */}
      <rect x={0} y={baseY} width={W} height={1} className="fill-line-strong" />

      {/* 每日尖峰 */}
      {days.map((d, i) => {
        const h = spikeHeight(d) * k;
        return (
          <rect
            key={d.start}
            x={i * 10 + 2}
            y={baseY - h}
            width={6}
            height={Math.max(1, h)}
            rx={0.8}
            className={`${FILL[d.state]} ${d.state === 'up' ? 'opacity-40' : ''}`}
          />
        );
      })}

      {/* NOW 游标：记录笔当前所在位置 */}
      <rect x={W - 1} y={baseY - 8} width={1} height={14} className="fill-accent" />

      {/* 悬停热区 + 原生 tooltip */}
      {days.map((d, i) => (
        <rect key={`h${d.start}`} x={i * 10} y={0} width={10} height={H} fill="#000" fillOpacity={0}>
          <title>{tooltip(d, timezone)}</title>
        </rect>
      ))}
    </svg>
  );
}

export function UptimeLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {(Object.keys(LABEL) as DayState[]).map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-subtle">
          <i className={`h-2 w-2 rounded-sm ${SWATCH[k]} opacity-80`} />
          {LABEL[k]}
        </span>
      ))}
    </div>
  );
}

function tooltip(d: DayCell, timezone: string): string {
  const date = formatTime(d.start, timezone, { year: 'numeric', month: 'long', day: 'numeric' });
  if (d.state === 'nodata') return `${date}：无数据`;
  const uptime = d.uptime !== null ? `${d.uptime.toFixed(2)}%` : '-';
  const down = d.downSeconds ? `，中断 ${Math.round(d.downSeconds / 60)} 分钟` : '';
  return `${date}：${LABEL[d.state]}（可用率 ${uptime}${down}）`;
}
