'use client';

import { useEffect, useState } from 'react';

interface Props {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}

/**
 * 具有平滑阻尼的数字滚算器 (Spring Numeric Counter)
 */
export function AnimatedCounter({
  value,
  duration = 800,
  decimals = 0,
  suffix = '',
  className = '',
}: Props) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) {
      setCurrent(value);
      return;
    }

    let start = current;
    const diff = value - start;
    if (diff === 0) return;

    let startTime: number | null = null;
    let animId: number;

    const easeOutQuart = (x: number): number => 1 - Math.pow(1 - x, 4);

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);

      setCurrent(start + diff * easedProgress);

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setCurrent(value);
      }
    };

    animId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(animId);
  }, [value, duration]);

  const formatted = decimals > 0 ? current.toFixed(decimals) : Math.round(current).toString();

  return (
    <span className={`inline-block font-mono tnum ${className}`}>
      {formatted}
      {suffix}
    </span>
  );
}
