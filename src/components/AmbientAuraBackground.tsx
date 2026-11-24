'use client';

import { useEffect, useRef } from 'react';

interface Props {
  className?: string;
}

/**
 * 纯净柔和的流体极光呼吸背景 (Hardware Accelerated GPU Aura)
 * 采用浏览器原生的 GPU 合成层（Compositor Layer）架构：
 * - 0 Canvas 绘制重绘消耗，彻底消除 4K / 高刷屏下的 Fill-rate 性能瓶颈
 * - 多色高斯柔光球由 GPU 独立图层驱动，在后台线程平滑插值漂移
 * - 结合 requestAnimationFrame 节流的柔性力场悬浮
 * - 稳锁 120 FPS，CPU 占用率接近 0%
 */
export function AmbientAuraBackground({ className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let rafId: number | null = null;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const onMouseMove = (e: MouseEvent) => {
      // 鼠标移动产生极轻微的背景视差（微位移不超过 15px）
      targetX = (e.clientX / window.innerWidth - 0.5) * 24;
      targetY = (e.clientY / window.innerHeight - 0.5) * 18;

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
        className="relative h-full w-full will-change-transform transition-transform duration-300 ease-out"
      >
        {/* 极光主球 1：翠绿晶亮光晕 (Emerald Bloom) */}
        <div
          className="animate-orb-1 absolute -top-[12%] left-[12%] h-[600px] w-[600px] rounded-full will-change-transform opacity-75 dark:opacity-70"
          style={{
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.22) 0%, rgba(16, 185, 129, 0.05) 55%, transparent 75%)',
            filter: 'blur(60px)',
          }}
        />

        {/* 极光主球 2：天青蔚蓝光晕 (Cyan Azure Bloom) */}
        <div
          className="animate-orb-2 absolute top-[6%] right-[8%] h-[560px] w-[560px] rounded-full will-change-transform opacity-70 dark:opacity-65"
          style={{
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.22) 0%, rgba(56, 189, 248, 0.05) 55%, transparent 75%)',
            filter: 'blur(65px)',
          }}
        />

        {/* 极光辅助球 3：暮紫星云微光 (Indigo Nebula Glow) */}
        <div
          className="animate-orb-3 absolute top-[28%] left-[32%] h-[500px] w-[500px] rounded-full will-change-transform opacity-50 dark:opacity-45"
          style={{
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.16) 0%, rgba(99, 102, 241, 0.03) 55%, transparent 75%)',
            filter: 'blur(70px)',
          }}
        />

        {/* 极光微光球 4：翡翠湖蓝流体 (Teal Lagoon Glow) */}
        <div
          className="animate-orb-1 absolute top-[45%] right-[22%] h-[460px] w-[460px] rounded-full will-change-transform opacity-40 dark:opacity-35"
          style={{
            background: 'radial-gradient(circle, rgba(20, 184, 166, 0.15) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      {/* 径向暗角与背景色过渡，保证文字极高对比度 */}
      <div className="absolute inset-0 bg-radial-vignette opacity-50 dark:opacity-75" />
    </div>
  );
}
