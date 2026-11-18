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

const STATE_TEXT: Record<MonitorState, string> = {
  up: '正常',
  down: '故障',
  paused: '已暂停',
  pending: '待检测',
};

export function StateToast({ snapshot }: StateToastProps) {
  const prevRef = useRef<Map<number, MonitorState> | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 定时器只在卸载时清理：快照更新时清掉会让已出的 toast 永远不自动消失
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

    if (changed.length === 0) {
      return;
    }

    setToasts((current) => [...current, ...changed]);

    for (const toast of changed) {
      timersRef.current.push(
        setTimeout(() => {
          setToasts((current) => current.filter((item) => item.key !== toast.key));
        }, 4000),
      );
    }
  }, [snapshot]);

  const dismiss = (key: string) => {
    setToasts((current) => current.filter((item) => item.key !== key));
  };

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(92vw,360px)] flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.key}
          className="card animate-enter pointer-events-auto flex gap-3"
          role={toast.to === 'down' ? 'alert' : undefined}
        >
          <span
            aria-hidden
            className={`w-[3px] shrink-0 ${toast.to === 'down' ? 'bg-down' : toast.to === 'up' ? 'bg-up' : 'bg-degraded'}`}
          />
          <div className="min-w-0 flex-1 py-3 pr-2">
            <p className="eyebrow">状态变更 / STATUS</p>
            <p className="mt-1 text-sm text-ink2">
              {toast.name}：{STATE_TEXT[toast.from]} → {STATE_TEXT[toast.to]}
            </p>
          </div>
          <button
            type="button"
            aria-label="关闭通知"
            onClick={() => dismiss(toast.key)}
            className="shrink-0 self-start px-2 py-3 font-mono text-sm text-subtle hover:text-ink"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
