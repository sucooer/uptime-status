'use client';

import { useEffect, useRef } from 'react';

interface Props {
  className?: string;
}

/**
 * 纯净柔和的流体极光背景 (Zero-Cost GPU Ambient Aurora)
 * - 彻底移除高开销的 CSS filter: blur()，纯靠径向渐变自身的不透明度衰减实现柔焦
 * - 解决移动端 / 低算力 GPU 上的渲染管线过载与掉帧问题
 * - 移动端自适应降级为静态/极低频柔和光斑，保证 120 FPS 丝滑滚动
 */
export function AmbientAuraBackground({ className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // 仅在支持高精度指针（桌面鼠标）时启用视差跟随，移动端完全禁用事件监听以节省电池
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) return;

    let rafId: number | null = null;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const onMouseMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 16;
      targetY = (e.clientY / window.innerHeight - 0.5) * 12;

      if (rafId === null) {
        rafId = requestAnimationFrame(update);
      }
    };

    const update = () => {
      currentX += (targetX - currentX) * 0.05;
      currentY += (targetY - currentY) * 0.05;

      if (containerRef.current) {
        containerRef.current.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;
      }

      if (Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05) {
        rafId = requestAnimationFrame(update);
      } else {
        rafId = null;
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 overflow-hidden ${className}`}
      style={{ zIndex: -2 }}
    >
      <div
        ref={containerRef}
        className="relative h-full w-full will-change-transform"
      >
        {/* 极光主光晕 1：翡翠青 (纯径向渐变自然衰减，0 滤镜损耗) */}
        <div
          className="absolute -top-[15%] left-[5%] h-[550px] w-[550px] rounded-full opacity-80 dark:opacity-70 animate-orb-1 sm:h-[650px] sm:w-[650px]"
          style={{
            background:
              'radial-gradient(circle closest-side, rgba(16, 185, 129, 0.16) 0%, rgba(16, 185, 129, 0.06) 40%, rgba(16, 185, 129, 0.01) 70%, transparent 100%)',
          }}
        />

        {/* 极光主光晕 2：天青蔚蓝 */}
        <div
          className="absolute top-[8%] right-[5%] h-[500px] w-[500px] rounded-full opacity-75 dark:opacity-65 animate-orb-2 sm:h-[600px] sm:w-[600px]"
          style={{
            background:
              'radial-gradient(circle closest-side, rgba(56, 189, 248, 0.16) 0%, rgba(56, 189, 248, 0.06) 40%, rgba(56, 189, 248, 0.01) 70%, transparent 100%)',
          }}
        />

        {/* 极光辅助光晕 3：暮紫云霞 (仅在桌面端或中大屏呈现，移动端自动隐藏避免 Overdraw) */}
        <div
          className="hidden sm:block absolute top-[35%] left-[30%] h-[500px] w-[500px] rounded-full opacity-50 dark:opacity-45 animate-orb-3"
          style={{
            background:
              'radial-gradient(circle closest-side, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0.04) 40%, transparent 100%)',
          }}
        />
      </div>

      {/* 极轻微暗角与底层柔化过渡 */}
      <div className="absolute inset-0 bg-radial-vignette opacity-40 dark:opacity-65" />
    </div>
  );
}
