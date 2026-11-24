'use client';

import { useEffect, useRef, useState } from 'react';
import type { MonitorState } from '@/lib/types';

type SnapshotItem = {
  id: number;
  name: string;
  state: MonitorState;
};

type StateToastProps = {
  snapshot: SnapshotItem[];
};

type Toast = {
  key: string;
  name: string;
  from: MonitorState;
  to: MonitorState;
};

const STATE_CONFIG: Record<
  MonitorState,
  { text: string; color: string; dot: string }
> = {
  up: { text: '已恢复正常', color: 'text-emerald-500', dot: 'bg-emerald-500' },
  down: { text: '发生故障中断', color: 'text-rose-500', dot: 'bg-rose-500' },
  paused: { text: '已暂停监测', color: 'text-slate-400', dot: 'bg-slate-400' },
  pending: { text: '正在重新检测', color: 'text-amber-500', dot: 'bg-amber-400' },
};

export function StateToast({ snapshot }: StateToastProps) {
  const prevRef = useRef<Map<number, MonitorState> | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(
    () => () => {
      for (const timer of timersRef.current) {
        clearTimeout(timer);
      }
    },
    [],
  );

  useEffect(() => {
    const next = new Map<number, MonitorState>();
    for (const item of snapshot) {
      next.set(item.id, item.state);
    }

    const prev = prevRef.current;
    if (prev === null) {
      prevRef.current = next;
      return;
    }

    const changed: Toast[] = [];
    snapshot.forEach((item, i) => {
      const from = prev.get(item.id);
      if (from !== undefined && from !== item.state) {
        changed.push({
          key: `${item.id}-${Date.now()}-${i}`,
          name: item.name,
          from,
          to: item.state,
        });
      }
    });

    prevRef.current = next;

    if (changed.length === 0) return;

    setToasts((current) => [...current, ...changed]);

    for (const toast of changed) {
      timersRef.current.push(
        setTimeout(() => {
          setToasts((current) => current.filter((item) => item.key !== toast.key));
        }, 5000),
      );
    }
  }, [snapshot]);

  const dismiss = (key: string) => {
    setToasts((current) => current.filter((item) => item.key !== key));
  };

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[min(92vw,380px)] flex-col gap-2.5"
    >
      {toasts.map((toast) => {
        const conf = STATE_CONFIG[toast.to];
        return (
          <div
            key={toast.key}
            role={toast.to === 'down' ? 'alert' : 'status'}
            className="pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border border-white/20 dark:border-white/10 bg-surface/90 p-4 shadow-2xl backdrop-blur-2xl animate-enter transition-all"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="relative flex h-3 w-3 shrink-0 items-center justify-center">
                <span className={`absolute h-full w-full rounded-full opacity-75 animate-ping ${conf.dot}`} />
                <span className={`relative h-2 w-2 rounded-full ${conf.dot}`} />
              </span>
              <div className="min-w-0">
                <p className="truncate font-sans text-xs font-semibold text-ink">
                  {toast.name}
                </p>
                <p className={`mt-0.5 font-sans text-xs ${conf.color}`}>
                  {conf.text}
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="关闭通知"
              onClick={() => dismiss(toast.key)}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-subtle transition-colors hover:bg-surface2 hover:text-ink"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
