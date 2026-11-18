'use client';

import type { DayCell, DayState } from '@/lib/types';
import { formatTime } from '@/lib/time';
import { useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

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

/**
 * 每日方块的静默不透明度：常态压低，让异常自己跳出来。
 * 顶端再叠一条高光刻度，读起来是仪表刻度条而不是色块墙。
 */
const BAR_OPACITY: Record<DayState, number> = {
  up: 0.3,
  degraded: 0.9,
  down: 0.9,
  nodata: 0.14,
};

const CAP_OPACITY: Record<DayState, number> = {
  up: 0.6,
  degraded: 1,
  down: 1,
  nodata: 0.14,
};

interface Props {
  days: DayCell[];
  timezone: string;
  /** 图形高度（px），卡片里用 48，总览用 96 */
  height?: number;
  /** 是否启用迹线检视（指针 + 键盘），默认关闭 */
  inspectable?: boolean;
}

/**
 * 90 天可用性方块条 —— 角形刻度条。
 *
 * 每天一根方角刻度，颜色表示状态：
 * - 绿色：正常
 * - 黄色：波动
 * - 红色：中断
 * - 灰色：无数据
 *
 * 鼠标悬停时刻度向上生长（方角不变），并给出当日详情。
 */
export function UptimeTrace({ days, timezone, height = 48, inspectable = false }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  if (!days.length) return null;

  const W = days.length * 14;
  const H = height;
  const barHeight = H - 6;
  const incidentCount = days.filter((d) => d.state === 'down' || d.state === 'degraded').length;

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!inspectable) return;
    const rect = ref.current!.getBoundingClientRect();
    const idx = Math.min(
      days.length - 1,
      Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * days.length)),
    );
    setHoveredIndex(idx);
  };

  const handlePointerLeave = () => {
    if (!inspectable) return;
    setHoveredIndex(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!inspectable) return;
    const last = days.length - 1;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setHoveredIndex((prev) => (prev === null ? 0 : Math.min(last, prev + 1)));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setHoveredIndex((prev) => (prev === null ? last : Math.max(0, prev - 1)));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setHoveredIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setHoveredIndex(last);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setHoveredIndex(null);
    }
  };

  const inspectProps: {
    tabIndex?: number;
    onPointerMove?: (e: PointerEvent<HTMLDivElement>) => void;
    onPointerLeave?: () => void;
    onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
  } = inspectable
    ? {
        tabIndex: 0,
        onPointerMove: handlePointerMove,
        onPointerLeave: handlePointerLeave,
        onKeyDown: handleKeyDown,
      }
    : {};

  const hovered = hoveredIndex !== null ? days[hoveredIndex] : null;
  const pct =
    hoveredIndex !== null
      ? Math.min(88, Math.max(12, ((hoveredIndex * 14 + 7) / W) * 100))
      : 0;

  return (
    <div ref={ref} className="relative" {...inspectProps}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block w-full"
        style={{ height: H }}
        role="img"
        suppressHydrationWarning
        aria-label={`最近 ${days.length} 天可用性记录，其中 ${incidentCount} 天出现过中断或波动`}
      >
        {days.map((d, i) => {
          const x = i * 14 + 2;
          const isHovered = hoveredIndex === i;
          const entranceDelay = Math.min(i, 30) * 0.02;

          return (
            <g
              key={d.start}
              className="animate-traceTick"
              style={{ animationDelay: `${entranceDelay}s` }}
            >
              {/* 刻度主体 */}
              <rect
                x={x}
                y={3}
                width={10}
                height={barHeight}
                rx={1}
                className={`${FILL[d.state]} transition-transform duration-200 ease-out`}
                style={{
                  transform: isHovered ? `scaleY(${(barHeight + 4) / barHeight})` : 'none',
                  transformOrigin: '50% 100%',
                  transformBox: 'fill-box',
                }}
                opacity={isHovered ? 1 : BAR_OPACITY[d.state]}
              />
              {/* 顶端高光刻度 */}
              <rect
                x={x}
                y={3}
                width={10}
                height={2}
                className={`${FILL[d.state]} transition-transform duration-200 ease-out`}
                style={{
                  transform: isHovered ? 'translateY(-4px)' : 'none',
                }}
                opacity={isHovered ? 1 : CAP_OPACITY[d.state]}
              />

              {/* 悬停热区 + tooltip */}
              <rect
                x={i * 14}
                y={0}
                width={14}
                height={H}
                fill="#000"
                fillOpacity={0}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {!inspectable && <title>{tooltip(d, timezone)}</title>}
              </rect>
            </g>
          );
        })}

        {/* 检视竖线 */}
        {inspectable && hoveredIndex !== null && (
          <rect x={hoveredIndex * 14 + 6.5} y={0} width={1} height={H} className="fill-accent" />
        )}

        {/* NOW 标记：今天的位置 */}
        <rect x={W - 3} y={1} width={1.5} height={H - 2} className="fill-accent" opacity={0.75} />
      </svg>

      {inspectable && hoveredIndex !== null && hovered && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap border border-line-strong bg-surface px-2.5 py-1.5 font-mono text-2xs"
          role="status"
          style={{ left: `${pct}%` }}
        >
          <div className="text-subtle">
            {formatTime(hovered.start, timezone, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
          <div>
            {hovered.state === 'nodata'
              ? '无数据'
              : `${LABEL[hovered.state]} · 可用率 ${
                  hovered.uptime !== null ? hovered.uptime.toFixed(2) + '%' : '-'
                }${
                  hovered.downSeconds > 0
                    ? ` · 中断 ${Math.round(hovered.downSeconds / 60)} 分钟`
                    : ''
                }`}
          </div>
        </div>
      )}
    </div>
  );
}

export function UptimeLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {(Object.keys(LABEL) as DayState[]).map((k) => (
        <span
          key={k}
          className="inline-flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-subtle"
        >
          <i className={`h-2.5 w-2 ${SWATCH[k]}`} style={{ opacity: BAR_OPACITY[k] }} />
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
