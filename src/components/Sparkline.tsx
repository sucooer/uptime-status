interface Props {
  values: number[];
  /** 线条颜色，支持 CSS 变量写法（如 var(--c-accent)） */
  color?: string;
  height?: number;
  className?: string;
}

/** 纯 SVG 渲染的响应时间迷你图，无需客户端 JS */
export function Sparkline({ values, color = 'var(--c-accent)', height = 40, className }: Props) {
  const W = 300;
  const H = height;

  if (!values.length) {
    return (
      <div
        className="flex items-center justify-center rounded border border-dashed border-line font-mono text-2xs uppercase tracking-wider text-subtle"
        style={{ height: H }}
      >
        暂无响应时间数据
      </div>
    );
  }

  const data = values.length > 120 ? downsample(values, 120) : values;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const step = data.length > 1 ? W / (data.length - 1) : W;

  const points = data.map((v, i) => {
    const x = i * step;
    const y = H - 4 - ((v - min) / span) * (H - 12);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const line = `M ${points.join(' L ')}`;
  const area = `${line} L ${W},${H} L 0,${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={className}
      style={{ width: '100%', height: H }}
      role="img"
      suppressHydrationWarning
      aria-label={`响应时间趋势，最近 ${data.length} 个采样点，峰值 ${Math.round(max)} 毫秒，谷值 ${Math.round(min)} 毫秒`}
    >
      {/* 参考网格 */}
      {[0.25, 0.5, 0.75].map((r) => (
        <line
          key={r}
          x1={0}
          x2={W}
          y1={H * r}
          y2={H * r}
          className="stroke-line"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}

      <path d={area} style={{ fill: color }} fillOpacity="0.1" />
      <path
        d={line}
        fill="none"
        style={{ stroke: color }}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
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
