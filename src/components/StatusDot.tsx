import { cn } from '../lib/cn';

type StatusDotTone = 'up' | 'down' | 'degraded' | 'muted' | 'paused' | 'pending';

const FILL: Record<StatusDotTone, string> = {
  up: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]',
  down: 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]',
  degraded: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]',
  muted: 'bg-slate-400 dark:bg-slate-500',
  paused: 'bg-slate-400 dark:bg-slate-500',
  pending: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]',
};

const RIPPLE: Record<StatusDotTone, string> = {
  up: 'bg-emerald-500/40',
  down: 'bg-rose-500/50',
  degraded: 'bg-amber-500/40',
  muted: 'bg-slate-400/30',
  paused: 'bg-slate-400/30',
  pending: 'bg-amber-400/30',
};

export function StatusDot({
  tone,
  pulse,
  className,
  size = 'md',
}: {
  tone: StatusDotTone;
  pulse?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeMap = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-3 w-3',
  };

  return (
    <span className={cn('relative inline-flex items-center justify-center shrink-0', sizeMap[size], className)}>
      {pulse || tone === 'down' ? (
        <span
          className={cn(
            'absolute inset-0 rounded-full animate-ping opacity-75',
            RIPPLE[tone]
          )}
        />
      ) : null}
      <span
        className={cn(
          'relative inline-block rounded-full transition-transform duration-300',
          sizeMap[size],
          FILL[tone]
        )}
      />
    </span>
  );
}
