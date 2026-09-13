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
 * 90 天可用性方块条 —— GitHub 贡献图风格。
 *
 * 每天一个饱满的圆角矩形，颜色表示状态：
 * - 绿色：正常
 * - 黄色：波动
 * - 红色：中断
 * - 灰色：无数据
 *
 * 鼠标悬停时有放大动画和详细信息提示。
 */
export function UptimeTrace({ days, timezone, height = 48 }: Props) {
  if (!days.length) return null;

  const W = days.length * 14;
  const H = height;
  const barHeight = H - 6;
  const incidentCount = days.filter((d) => d.state === 'down' || d.state === 'degraded').length;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="block w-full"
      style={{ height: H }}
      role="img"
      suppressHydrationWarning
      aria-label={`最近 ${days.length} 天可用性记录，其中 ${incidentCount} 天出现过中断或波动`}
    >
      {/* 每日方块 */}
      {days.map((d, i) => {
        const x = i * 14 + 2;
        const y = 3;

        return (
          <g key={d.start} className="group cursor-pointer">
            {/* 方块：悬停时从底部向上放大 10%，圆角保持 */}
            <rect
              x={x}
              y={y}
              width={10}
              height={barHeight}
              rx={4}
              className={`${FILL[d.state]} transition-all duration-200 ease-out group-hover:scale-y-110 group-hover:brightness-110`}
              opacity={d.state === 'nodata' ? 0.3 : d.state === 'up' ? 0.9 : 1}
              style={{
                transformBox: 'fill-box',
                transformOrigin: 'center bottom',
              }}
            />

            {/* 悬停热区 + tooltip */}
            <rect x={i * 14} y={0} width={14} height={H} fill="#000" fillOpacity={0}>
              <title>{tooltip(d, timezone)}</title>
            </rect>
          </g>
        );
      })}

      {/* NOW 标记：今天的位置 */}
      <rect x={W - 3} y={2} width={2} height={H - 4} className="fill-accent" rx={1} opacity={0.6} />
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
