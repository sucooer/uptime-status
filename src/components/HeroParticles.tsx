'use client';

import { useEffect, useRef } from 'react';

export function HeroParticles() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const target: HTMLCanvasElement = canvas;
    const host: HTMLElement = parent;
    const context: CanvasRenderingContext2D = ctx;

    const spacing = 30;
    const radius = 1.4;
    const rowHeight = (spacing * Math.sqrt(3)) / 2;
    const tau = Math.PI * 2;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function readSignal(): string {
      const value = window
        .getComputedStyle(document.documentElement)
        .getPropertyValue('--c-signal')
        .trim();
      return value.length > 0 ? value : '0 0 0';
    }

    let signal = readSignal();
    let width = 0;
    let height = 0;
    let lastWidth = -1;
    let lastHeight = -1;
    let x = new Float64Array(0);
    let y = new Float64Array(0);
    let vx = new Float64Array(0);
    let vy = new Float64Array(0);
    let hx = new Float64Array(0);
    let hy = new Float64Array(0);
    let pointer: { x: number; y: number } | null = null;
    let running = false;
    let rafId: number | null = null;
    let lastTime = 0;
    let visible = true;
    let allConverged = true;

    function layout(w: number, h: number): void {
      if (w <= 0 || h <= 0) {
        x = new Float64Array(0);
        y = new Float64Array(0);
        vx = new Float64Array(0);
        vy = new Float64Array(0);
        hx = new Float64Array(0);
        hy = new Float64Array(0);
        return;
      }

      const startX = spacing / 2;
      const startY = spacing / 2;
      let count = 0;

      for (let py = startY, row = 0; py < h + rowHeight; py += rowHeight, row++) {
        const offsetX = (row & 1) === 0 ? 0 : spacing / 2;
        for (let px = startX + offsetX; px < w + spacing; px += spacing) {
          count++;
        }
      }

      x = new Float64Array(count);
      y = new Float64Array(count);
      vx = new Float64Array(count);
      vy = new Float64Array(count);
      hx = new Float64Array(count);
      hy = new Float64Array(count);

      let i = 0;
      for (let py = startY, row = 0; py < h + rowHeight; py += rowHeight, row++) {
        const offsetX = (row & 1) === 0 ? 0 : spacing / 2;
        for (let px = startX + offsetX; px < w + spacing; px += spacing) {
          x[i] = px;
          y[i] = py;
          vx[i] = 0;
          vy[i] = 0;
          hx[i] = px;
          hy[i] = py;
          i++;
        }
      }
    }

    function draw(): void {
      if (width <= 0 || height <= 0) return;

      context.clearRect(0, 0, width, height);
      context.fillStyle = `rgb(${signal} / 0.32)`;
      context.beginPath();

      const n = x.length;
      for (let i = 0; i < n; i++) {
        const px = x[i];
        const py = y[i];
        const sx = vx[i];
        const sy = vy[i];
        const speed = Math.sqrt(sx * sx + sy * sy);

        if (speed < 0.3) {
          context.moveTo(px + radius, py);
          context.arc(px, py, radius, 0, tau);
        } else {
          const angle = Math.atan2(sy, sx);
          const s = Math.min(2.6, 1 + speed * 0.12);
          const rx = radius * s;
          const ry = radius / Math.sqrt(s);
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          context.moveTo(px + rx * cos, py + rx * sin);
          context.ellipse(px, py, rx, ry, angle, 0, tau);
        }
        context.closePath();
      }

      context.fill();
    }

    function resize(): void {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w === lastWidth && h === lastHeight) return;

      lastWidth = w;
      lastHeight = h;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = w;
      height = h;
      target.width = Math.max(0, Math.round(w * dpr));
      target.height = Math.max(0, Math.round(h * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      layout(w, h);
      allConverged = pointer === null;
      draw();
    }

    function tick(now: number): void {
      const elapsed = now - lastTime;
      lastTime = now;
      const dt = Math.min(2, Math.max(0, elapsed / 16.667));
      const damp = Math.pow(0.84, dt);
      const n = x.length;
      let converged = pointer === null;

      for (let i = 0; i < n; i++) {
        if (pointer !== null) {
          const dx = x[i] - pointer.x;
          const dy = y[i] - pointer.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > 0 && d < 80) {
            const force = Math.pow(1 - d / 80, 2) * 6.6;
            vx[i] += (dx / d) * force * dt;
            vy[i] += (dy / d) * force * dt;
          }
        }

        vx[i] += (hx[i] - x[i]) * 0.05 * dt;
        vy[i] += (hy[i] - y[i]) * 0.05 * dt;
        vx[i] *= damp;
        vy[i] *= damp;
        x[i] += vx[i] * dt;
        y[i] += vy[i] * dt;

        if (
          Math.abs(hx[i] - x[i]) < 0.05 &&
          Math.abs(hy[i] - y[i]) < 0.05 &&
          Math.abs(vx[i]) < 0.02 &&
          Math.abs(vy[i]) < 0.02
        ) {
          x[i] = hx[i];
          y[i] = hy[i];
          vx[i] = 0;
          vy[i] = 0;
        } else if (converged) {
          converged = false;
        }
      }

      allConverged = converged;
      draw();

      if (pointer === null && allConverged) {
        running = false;
        rafId = null;
        return;
      }

      rafId = requestAnimationFrame(tick);
    }

    function ensureRunning(): void {
      if (reduced || !visible || running) return;
      if (pointer === null && allConverged) return;

      running = true;
      lastTime = performance.now();
      rafId = requestAnimationFrame(tick);
    }

    function localPoint(event: PointerEvent): { x: number; y: number } {
      const rect = target.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    }

    function onPointerMove(event: PointerEvent): void {
      pointer = localPoint(event);
      ensureRunning();
    }

    function onPointerLeave(): void {
      pointer = null;
      ensureRunning();
    }

    function onPointerDown(event: PointerEvent): void {
      const p = localPoint(event);
      pointer = p;

      const n = x.length;
      for (let i = 0; i < n; i++) {
        const dx = x[i] - p.x;
        const dy = y[i] - p.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 0 && d < 200) {
          const impulse = (1 - d / 200) * 30 * 1.12;
          vx[i] += (dx / d) * impulse;
          vy[i] += (dy / d) * impulse;
        }
      }

      allConverged = false;
      ensureRunning();
    }

    if (reduced) {
      resize();
      return () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
      };
    }

    host.addEventListener('pointermove', onPointerMove);
    host.addEventListener('pointerleave', onPointerLeave);
    host.addEventListener('pointercancel', onPointerLeave);
    host.addEventListener('pointerdown', onPointerDown);

    const mutationObserver = new MutationObserver(() => {
      signal = readSignal();
      if (!running) draw();
    });
    mutationObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    const resizeObserver = new ResizeObserver(() => {
      resize();
      ensureRunning();
    });
    resizeObserver.observe(host);

    const intersectionObserver = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (!entry) return;

      visible = entry.isIntersecting;
      if (!visible) {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        running = false;
      } else {
        ensureRunning();
      }
    });
    intersectionObserver.observe(target);

    resize();
    ensureRunning();

    return () => {
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerleave', onPointerLeave);
      host.removeEventListener('pointercancel', onPointerLeave);
      host.removeEventListener('pointerdown', onPointerDown);

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      running = false;

      mutationObserver.disconnect();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
