'use client';

import type { DayCell, DayState } from '@/lib/types';
import { formatTime } from '@/lib/time';
import { useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

const FILL: Record<DayState, string> = {
  up: 'fill-emerald-500',
  degraded: 'fill-amber-500',
  down: 'fill-rose-500',
  nodata: 'fill-slate-400 dark:fill-slate-600',
};

const SWATCH: Record<DayState, string> = {
  up: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  down: 'bg-rose-500',
  nodata: 'bg-slate-400 dark:bg-slate-600',
};

const LABEL: Record<DayState, string> = {
  up: '正常',
  degraded: '波动',
  down: '中断',
  nodata: '无数据',
};

const BAR_OPACITY: Record<DayState, number> = {
  up: 0.38,
  degraded: 0.95,
  down: 0.95,
  nodata: 0.2,
};

interface Props {
  days: DayCell[];
  timezone: string;
  height?: number;
  inspectable?: boolean;
}

export function UptimeTrace({ days, timezone, height = 48, inspectable = false }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  if (!days.length) return null;

  const W = days.length * 14;
  const H = height;
  const barHeight = H - 8;
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

  const inspectProps = inspectable
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
    <div ref={ref} className="group/trace relative select-none outline-none" {...inspectProps}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block w-full overflow-visible"
        style={{ height: H }}
        role="img"
        suppressHydrationWarning
        aria-label={`最近 ${days.length} 天可用性记录，其中 ${incidentCount} 天出现过中断或波动`}
      >
        {days.map((d, i) => {
          const x = i * 14 + 2;
          const isDirectHover = hoveredIndex === i;
          const isNeighbor = hoveredIndex !== null && Math.abs(hoveredIndex - i) === 1;
          const entranceDelay = Math.min(i, 35) * 0.015;

          // 磁吸波浪高度偏移
          let translateY = 0;
          let scaleY = 1;
          if (isDirectHover) {
            translateY = -5;
            scaleY = 1.08;
          } else if (isNeighbor) {
            translateY = -2;
            scaleY = 1.03;
          }

          return (
            <g
              key={d.start}
              style={{
                animation: `barRise 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${entranceDelay}s both`,
                transformOrigin: '50% 100%',
              }}
            >
              {/* 刻度柱主体：圆角胶囊 */}
              <rect
                x={x}
                y={4}
                width={10}
                height={barHeight}
                rx={3}
                className={`${FILL[d.state]} transition-[transform,opacity] duration-150 ease-out`}
                style={{
                  transform: `translateY(${translateY}px) scaleY(${scaleY})`,
                  transformOrigin: '50% 100%',
                }}
                opacity={isDirectHover ? 1 : isNeighbor ? 0.75 : BAR_OPACITY[d.state]}
              />

              {/* 顶部高光微帽 */}
              <rect
                x={x}
                y={4}
                width={10}
                height={2.5}
                rx={1.25}
                className={`${FILL[d.state]} transition-[transform,opacity] duration-150 ease-out`}
                style={{
                  transform: `translateY(${translateY}px)`,
                }}
                opacity={isDirectHover ? 1 : 0.75}
              />

              {/* 交互感知热区 */}
              <rect
                x={i * 14}
                y={0}
                width={14}
                height={H}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {!inspectable && <title>{tooltip(d, timezone)}</title>}
              </rect>
            </g>
          );
        })}

        {/* 检视垂直光束 */}
        {inspectable && hoveredIndex !== null && (
          <line
            x1={hoveredIndex * 14 + 7}
            y1={0}
            x2={hoveredIndex * 14 + 7}
            y2={H}
            className="stroke-accent/70"
            strokeWidth={1.5}
            strokeDasharray="2 2"
          />
        )}
      </svg>

      {/* 极光毛玻璃悬浮气泡 (Liquid Frosted Tooltip) */}
      {inspectable && hoveredIndex !== null && hovered && (
        <div
          className="pointer-events-none absolute -top-12 z-20 -translate-x-1/2 whitespace-nowrap rounded-xl border border-white/20 dark:border-white/10 bg-surface/90 px-3 py-1.5 shadow-xl backdrop-blur-xl transition-all duration-150 ease-out animate-enter"
          role="status"
          style={{ left: `${pct}%` }}
        >
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${SWATCH[hovered.state]} ${
                hovered.state === 'down' ? 'animate-ping' : ''
              }`}
            />
            <span className="font-sans text-xs font-medium text-ink">
              {formatTime(hovered.start, timezone, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <span className="text-line-strong">·</span>
            <span className="font-mono text-xs text-subtle">
              {hovered.state === 'nodata'
                ? '无数据'
                : `可用率 ${
                    hovered.uptime !== null ? hovered.uptime.toFixed(2) + '%' : '-'
                  }${
                    hovered.downSeconds > 0
                      ? ` (中断 ${Math.round(hovered.downSeconds / 60)}m)`
                      : ''
                  }`}
            </span>
          </div>
          {/* 小倒三角指引箭头 */}
          <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-white/20 dark:border-white/10 bg-surface/90" />
        </div>
      )}
    </div>
  );
}

export function UptimeLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {(Object.keys(LABEL) as DayState[]).map((k) => (
        <span
          key={k}
          className="inline-flex items-center gap-1.5 rounded-full border border-line/40 bg-surface2/40 px-2 py-0.5 font-sans text-xs text-subtle"
        >
          <span
            className={`h-2 w-2 rounded-full ${SWATCH[k]}`}
            style={{ opacity: BAR_OPACITY[k] }}
          />
          <span>{LABEL[k]}</span>
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
