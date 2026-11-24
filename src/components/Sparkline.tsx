'use client';

import { useState } from 'react';

interface Props {
  values: number[];
  color?: string;
  height?: number;
  className?: string;
}

/**
 * 现代流体平滑贝塞尔曲线响应时间图 (Fluid Spline Sparkline)
 * - 采用三阶贝塞尔样条插值（Cubic Bezier Spline），告别生硬折线
 * - 柔和渐变填充 + 动态流光粒子扫掠 (Shimmer Beam)
 * - 悬停磁吸刻度光标，即时显示毫秒延迟
 */
export function Sparkline({
  values,
  color = 'rgb(var(--c-accent))',
  height = 42,
  className = '',
}: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const W = 320;
  const H = height;

  if (!values.length) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-line/50 font-mono text-xs text-subtle"
        style={{ height: H }}
      >
        暂无响应时间数据
      </div>
    );
  }

  const data = values.length > 80 ? downsample(values, 80) : values;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const step = data.length > 1 ? W / (data.length - 1) : W;

  const points = data.map((v, i) => {
    const x = i * step;
    const y = H - 4 - ((v - min) / span) * (H - 10);
    return { x, y, v };
  });

  // 生成平滑三阶贝塞尔曲线路径
  const linePath = generateSmoothPath(points);
  const areaPath = `${linePath} L ${W},${H} L 0,${H} Z`;

  const hoveredPoint = hoverIdx !== null && points[hoverIdx] ? points[hoverIdx] : null;

  return (
    <div
      className={`group/spark relative select-none ${className}`}
      onMouseLeave={() => setHoverIdx(null)}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block w-full overflow-visible"
        style={{ height: H }}
        role="img"
        suppressHydrationWarning
        aria-label={`响应时间趋势图，当前均值 ${Math.round(data[data.length - 1])}ms`}
      >
        <defs>
          <linearGradient id={`grad-${color.replace(/\W/g, '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.24" />
            <stop offset="70%" stopColor={color} stopOpacity="0.04" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 辅助水平参考发丝线 */}
        <line
          x1={0}
          x2={W}
          y1={H * 0.5}
          y2={H * 0.5}
          className="stroke-line/30"
          strokeWidth={1}
          strokeDasharray="2 3"
        />

        {/* 渐变流体面积 */}
        <path d={areaPath} fill={`url(#grad-${color.replace(/\W/g, '')})`} />

        {/* 发光底层发光光晕（硬件矢量，免 SVG 滤镜栅格化卡顿） */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.25"
        />

        {/* 核心平滑贝塞尔曲线 */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 交互感知热区（按列捕捉） */}
        {points.map((p, i) => (
          <rect
            key={i}
            x={i === 0 ? 0 : p.x - step / 2}
            y={0}
            width={step}
            height={H}
            fill="transparent"
            className="cursor-crosshair"
            onMouseEnter={() => setHoverIdx(i)}
          />
        ))}

        {/* 悬停垂直准星与光标吸附点 */}
        {hoveredPoint && (
          <g>
            <line
              x1={hoveredPoint.x}
              y1={0}
              x2={hoveredPoint.x}
              y2={H}
              className="stroke-accent/70"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r={3.5}
              className="fill-surface stroke-accent"
              strokeWidth={2}
              style={{ filter: 'drop-shadow(0 0 6px rgb(var(--c-accent)))' }}
            />
          </g>
        )}
      </svg>

      {/* 毫秒延迟气泡 */}
      {hoveredPoint && (
        <div
          className="pointer-events-none absolute -top-7 z-10 -translate-x-1/2 rounded-md border border-line-strong/60 bg-surface/90 px-1.5 py-0.5 font-mono text-[10px] font-medium text-ink shadow-md backdrop-blur-md"
          style={{ left: `${(hoveredPoint.x / W) * 100}%` }}
        >
          {Math.round(hoveredPoint.v)}ms
        </div>
      )}
    </div>
  );
}

/**
 * 将离散点集转化为高质量三阶贝塞尔平滑路径 (Cubic Bezier Spline)
 */
function generateSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

  let path = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const tension = 0.22;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    path += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  return path;
}

function downsample(values: number[], target: number): number[] {
  const bucket = values.length / target;
  const out: number[] = [];
  for (let i = 0; i < target; i++) {
    const from = Math.floor(i * bucket);
    const to = Math.min(values.length, Math.floor((i + 1) * bucket));
    const slice = values.slice(from, Math.max(to, from + 1));
    out.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return out;
}
