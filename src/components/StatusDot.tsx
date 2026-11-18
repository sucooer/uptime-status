import { cn } from '../lib/cn';

type StatusDotTone = 'up' | 'down' | 'degraded' | 'muted' | 'paused' | 'pending';

const FILL: Record<StatusDotTone, string> = {
  up: 'bg-up',
  down: 'bg-down',
  degraded: 'bg-degraded',
  muted: 'bg-line-strong',
  paused: 'bg-line-strong',
  pending: 'bg-degraded',
};

export function StatusDot({
  tone,
  pulse,
  className,
}: {
  tone: StatusDotTone;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('relative flex h-1.5 w-1.5 shrink-0', className)}>
      {pulse ? (
        <span className="absolute inline-flex h-full w-full animate-pulseRing rounded-full bg-down" />
      ) : null}
      <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', FILL[tone])} />
    </span>
  );
}
