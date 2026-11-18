'use client';

import { useEffect, useRef } from 'react';

interface Palette {
  colors: string[];
  dot: number;
  link: number;
  cursor: number;
}

const PALETTES: Record<'dark' | 'light', Palette> = {
  dark: {
    colors: [
      '235,250,250',
      '135,206,250',
      '70,243,231',
      '253,224,71',
      '216,150,255',
      '255,159,243',
    ],
    dot: 0.85,
    link: 0.32,
    cursor: 0.7,
  },
  light: {
    colors: [
      '11,110,122',
      '13,128,128',
      '15,122,84',
      '146,88,8',
      '120,86,160',
      '45,82,80',
    ],
    dot: 0.4,
    link: 0.14,
    cursor: 0.3,
  },
};

const CFG = {
  density: 11000,
  maxParticles: 200,
  minSpeed: 0.2,
  maxSpeed: 0.8,
  lineDist: 120,
  mouseDist: 160,
  repulseRadius: 30,
  burstCount: 28,
  meteorRate: 0.004,
  maxMeteors: 2,
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rgb: string;
}

interface Burst {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rgb: string;
  alpha: number;
  decay: number;
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  len: number;
  rgb: string;
  alpha: number;
  fadeIn: boolean;
  life: number;
  maxLife: number;
}

/**
 * 全站星空粒子背景：粒子缓慢漂移、近距离连线、指针吸附、点击爆发、偶发流星。
 * 只作为装饰层，不接收指针事件；监听挂 window，因此不影响页面交互。
 */
export function StarfieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const context: CanvasRenderingContext2D = ctx;
    const target: HTMLCanvasElement = canvas;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let dark = document.documentElement.classList.contains('dark');
    let palette = PALETTES[dark ? 'dark' : 'light'];
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let bursts: Burst[] = [];
    let meteors: Meteor[] = [];
    let rafId: number | null = null;
    let running = false;
    let visible = true;

    const mouse: { x: number | null; y: number | null } = { x: null, y: null };

    const pick = (): string => palette.colors[Math.floor(Math.random() * palette.colors.length)];

    function makeParticle(): Particle {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (CFG.maxSpeed - CFG.minSpeed) + CFG.minSpeed;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: Math.random() * 1.9 + 0.6,
        rgb: pick(),
      };
    }

    function makeBurst(x: number, y: number): Burst {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 1.5;
      return {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: Math.random() * 2.5 + 1,
        rgb: pick(),
        alpha: 1,
        decay: Math.random() * 0.02 + 0.015,
      };
    }

    function makeMeteor(): Meteor {
      const toRight = Math.random() < 0.5;
      const speed = Math.random() * 9 + 7;
      const angle = toRight
        ? (Math.random() * 0.3 + 0.12) * Math.PI
        : (Math.random() * 0.3 + 0.58) * Math.PI;
      return {
        x: toRight
          ? Math.random() * width * 0.8 - 100
          : Math.random() * width * 0.8 + width * 0.2 + 100,
        y: Math.random() * height * 0.35 - 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        angle,
        len: Math.random() * 110 + 70,
        rgb: pick(),
        alpha: 0,
        fadeIn: true,
        life: 0,
        maxLife: Math.random() * 40 + 45,
      };
    }

    function resize(): void {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = window.innerWidth;
      height = window.innerHeight;
      target.width = Math.max(1, Math.round(width * dpr));
      target.height = Math.max(1, Math.round(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (reduced) {
        // 减少动效时只保留一层静态星点
        particles = Array.from(
          { length: Math.floor((width * height) / CFG.density) },
          makeParticle,
        );
      } else {
        particles = Array.from(
          {
            length: Math.min(
              CFG.maxParticles,
              Math.floor((width * height) / CFG.density),
            ),
          },
          makeParticle,
        );
      }

      bursts = [];
      meteors = [];
      draw();
    }

    function draw(): void {
      context.clearRect(0, 0, width, height);
      if (width === 0 || height === 0) return;

      if (!reduced) {
        drawMeteors();
      }

      const n = particles.length;
      const maxLink = CFG.lineDist;

      context.lineWidth = 0.8;
      for (let i = 0; i < n; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < n; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          if (dx > maxLink || dx < -maxLink || dy > maxLink || dy < -maxLink) continue;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d >= maxLink) continue;
          context.beginPath();
          context.strokeStyle = `rgba(${p1.rgb},${(1 - d / maxLink) * palette.link})`;
          context.moveTo(p1.x, p1.y);
          context.lineTo(p2.x, p2.y);
          context.stroke();
        }
      }

      for (let i = 0; i < n; i++) {
        const p = particles[i];
        context.beginPath();
        context.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        context.fillStyle = `rgba(${p.rgb},${palette.dot})`;
        context.fill();
      }

      if (mouse.x !== null && mouse.y !== null) {
        const mx = mouse.x;
        const my = mouse.y;
        const maxCursor = CFG.mouseDist;
        context.lineWidth = 1;
        for (let i = 0; i < n; i++) {
          const p = particles[i];
          const dx = p.x - mx;
          const dy = p.y - my;
          if (dx > maxCursor || dx < -maxCursor || dy > maxCursor || dy < -maxCursor) continue;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d >= maxCursor) continue;
          context.beginPath();
          context.strokeStyle = `rgba(${p.rgb},${(1 - d / maxCursor) * palette.cursor})`;
          context.moveTo(p.x, p.y);
          context.lineTo(mx, my);
          context.stroke();
        }
      }

      for (let i = 0; i < bursts.length; i++) {
        const b = bursts[i];
        context.save();
        context.beginPath();
        context.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        context.fillStyle = `rgba(${b.rgb},${Math.max(0, b.alpha)})`;
        context.shadowBlur = 8;
        context.shadowColor = `rgb(${b.rgb})`;
        context.fill();
        context.restore();
      }
    }

    function drawMeteors(): void {
      for (let i = 0; i < meteors.length; i++) {
        const m = meteors[i];
        if (m.alpha <= 0) continue;
        const tx = m.x - Math.cos(m.angle) * m.len;
        const ty = m.y - Math.sin(m.angle) * m.len;
        context.save();
        const grad = context.createLinearGradient(m.x, m.y, tx, ty);
        grad.addColorStop(0, `rgba(255,255,255,${m.alpha})`);
        grad.addColorStop(0.25, `rgba(${m.rgb},${m.alpha * 0.85})`);
        grad.addColorStop(1, `rgba(${m.rgb},0)`);
        context.beginPath();
        context.strokeStyle = grad;
        context.lineWidth = 2.2;
        context.lineCap = 'round';
        context.moveTo(m.x, m.y);
        context.lineTo(tx, ty);
        context.stroke();

        context.beginPath();
        context.arc(m.x, m.y, 1.8, 0, Math.PI * 2);
        context.fillStyle = `rgba(255,255,255,${m.alpha})`;
        context.shadowBlur = 12;
        context.shadowColor = `rgb(${m.rgb})`;
        context.fill();
        context.restore();
      }
    }

    function step(): void {
      rafId = null;

      if (meteors.length < CFG.maxMeteors && Math.random() < CFG.meteorRate) {
        meteors.push(makeMeteor());
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.x += m.vx;
        m.y += m.vy;
        m.life++;
        if (m.fadeIn) {
          m.alpha += 0.08;
          if (m.alpha >= 1) {
            m.alpha = 1;
            m.fadeIn = false;
          }
        } else if (m.life > m.maxLife * 0.6) {
          m.alpha -= 0.03;
        }
        if (m.alpha <= 0 && !m.fadeIn) meteors.splice(i, 1);
      }

      const n = particles.length;
      for (let i = 0; i < n; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          if (dx > CFG.mouseDist || dx < -CFG.mouseDist || dy > CFG.mouseDist || dy < -CFG.mouseDist) {
            continue;
          }
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CFG.mouseDist && d > CFG.repulseRadius) {
            p.x += dx * 0.015;
            p.y += dy * 0.015;
          }
        }
      }

      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.vx *= 0.95;
        b.vy *= 0.95;
        b.x += b.vx;
        b.y += b.vy;
        b.alpha -= b.decay;
        if (b.alpha <= 0) bursts.splice(i, 1);
      }

      draw();

      if (running && visible) rafId = requestAnimationFrame(step);
      else running = false;
    }

    function start(): void {
      if (reduced || running || !visible) return;
      running = true;
      rafId = requestAnimationFrame(step);
    }

    function stop(): void {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      running = false;
    }

    function onPointerMove(event: PointerEvent): void {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    }

    function onPointerLeave(): void {
      mouse.x = null;
      mouse.y = null;
    }

    function onPointerDown(event: PointerEvent): void {
      if (reduced) return;
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      for (let i = 0; i < CFG.burstCount; i++) {
        bursts.push(makeBurst(event.clientX, event.clientY));
      }
      start();
    }

    function onVisibilityChange(): void {
      visible = document.visibilityState === 'visible';
      if (visible) start();
      else stop();
    }

    const themeObserver = new MutationObserver(() => {
      const next = document.documentElement.classList.contains('dark');
      if (next === dark) return;
      dark = next;
      palette = PALETTES[dark ? 'dark' : 'light'];
      for (let i = 0; i < particles.length; i++) particles[i].rgb = pick();
      meteors = [];
      if (!running) draw();
    });

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('pointercancel', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibilityChange);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    resize();
    if (!reduced) start();

    return () => {
      stop();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('pointercancel', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      themeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 h-full w-full"
      style={{ zIndex: -1 }}
    />
  );
}
