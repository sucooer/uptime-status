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

  const W = days.length * 12;
  const H = height;
  const baseY = H - 12;
  /** 高度缩放：卡片里的紧凑版等比压扁 */
  const k = Math.max(0.5, (H - 20) / 80);
  const maxDown = Math.max(...days.map((d) => d.downSeconds), 0);

  const spikeHeight = (d: DayCell): number => {
    if (d.state === 'nodata') return 8;
    if (d.state === 'up') return 16;
    const f = maxDown > 0 ? Math.sqrt(Math.min(1, d.downSeconds / maxDown)) : 1;
    return d.state === 'down' ? 50 + f * 50 : 28 + f * 32;
  };

  const incidentCount = days.filter((d) => d.state === 'down' || d.state === 'degraded').length;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="animate-trace block w-full"
      style={{ height: H }}
      role="img"
      suppressHydrationWarning
      aria-label={`最近 ${days.length} 天可用性迹线，其中 ${incidentCount} 天出现过中断或波动`}
    >
      <defs>
        {/* 渐变定义 */}
        <linearGradient id="gradient-up" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="text-up" stopColor="currentColor" stopOpacity="0.9" />
          <stop offset="100%" className="text-up" stopColor="currentColor" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="gradient-degraded" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="text-degraded" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" className="text-degraded" stopColor="currentColor" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="gradient-down" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="text-down" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" className="text-down" stopColor="currentColor" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* 纵向刻度：每 30 天一条发丝参考线 */}
      {days.length >= 30 &&
        Array.from({ length: Math.floor((days.length - 1) / 30) }, (_, i) => (days.length - 1) * 12 - (i + 1) * 30 * 12).map(
          (x) => (
            <rect key={`g${x}`} x={x} y={6} width={1} height={baseY - 6} className="fill-line opacity-50" />
          ),
        )}

      {/* 周刻度：基线下方的小齿 */}
      {days.map((d, i) =>
        (days.length - 1 - i) % 7 === 0 ? (
          <rect key={`t${d.start}`} x={i * 12 + 2} y={baseY + 4} width={1} height={5} className="fill-line-strong opacity-60" />
        ) : null,
      )}

      {/* 基线：走纸的零位，加粗更明显 */}
      <rect x={0} y={baseY} width={W} height={2} className="fill-line-strong" rx={1} />

      {/* 每日尖峰 */}
      {days.map((d, i) => {
        const h = spikeHeight(d) * k;
        const x = i * 12 + 2;
        const y = baseY - h;

        // 根据状态选择填充
        let fill: string;
        let opacity = 1;
        if (d.state === 'up') {
          fill = 'url(#gradient-up)';
          opacity = 0.7;
        } else if (d.state === 'degraded') {
          fill = 'url(#gradient-degraded)';
        } else if (d.state === 'down') {
          fill = 'url(#gradient-down)';
        } else {
          fill = FILL[d.state];
          opacity = 0.4;
        }

        return (
          <g key={d.start}>
            {/* 主尖峰 */}
            <rect
              x={x}
              y={y}
              width={8}
              height={Math.max(3, h)}
              rx={2}
              fill={fill}
              opacity={opacity}
              className={d.state === 'nodata' ? FILL[d.state] : ''}
            />
            {/* 故障/波动时添加顶部高光 */}
            {(d.state === 'down' || d.state === 'degraded') && (
              <rect
                x={x}
                y={y}
                width={8}
                height={Math.min(10, h * 0.35)}
                rx={2}
                className={FILL[d.state]}
                opacity={0.9}
              />
            )}
          </g>
        );
      })}

      {/* NOW 游标：记录笔当前所在位置，更明显 */}
      <rect x={W - 2} y={baseY - 12} width={2} height={20} className="fill-accent" rx={1} />
      <circle cx={W - 1} cy={baseY - 12} r={3} className="fill-accent" opacity={0.6} />

      {/* 悬停热区 + 原生 tooltip */}
      {days.map((d, i) => (
        <rect key={`h${d.start}`} x={i * 12} y={0} width={12} height={H} fill="#000" fillOpacity={0}>
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
