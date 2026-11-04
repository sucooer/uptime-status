import type { Incident } from '@/lib/types';

interface Props {
  incident: Incident;
  /** 是否仍在故障中，影响配色 */
  active?: boolean;
  className?: string;
}

/** 展示故障原因（UptimeRobot 日志的 reason.code / reason.detail） */
export function ReasonLine({ incident, active = false, className = '' }: Props) {
  const { reasonCode, reasonText } = incident;

  if (!reasonText) {
    return (
      <div className={`font-mono text-2xs uppercase tracking-wider text-subtle ${className}`}>
        未提供具体原因
      </div>
    );
  }

  const showCode = Boolean(reasonCode) && reasonCode !== reasonText;

  return (
    <div className={`flex items-start gap-1.5 text-xs leading-relaxed ${className}`}>
      {showCode && (
        <span
          className={`chip shrink-0 tnum ${
            active ? 'border-down/50 text-down' : 'border-line-strong text-ink2'
          }`}
        >
          {reasonCode}
        </span>
      )}
      <span className="min-w-0 break-words text-ink2">{reasonText}</span>
    </div>
  );
}
