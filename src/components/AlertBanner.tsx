'use client';

import { HudButton } from './HudButton';

type AlertBannerProps = {
  downNames: string[];
};

export function AlertBanner({ downNames }: AlertBannerProps) {
  const shown =
    downNames.length > 3
      ? `${downNames.slice(0, 3).join('、')} 等 ${downNames.length} 个`
      : downNames.join('、');

  const handleLocate = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior = reduce ? 'auto' : 'smooth';
    const target = document.querySelector('[data-state="down"]');
    const article = target?.closest('article');
    if (article) {
      article.scrollIntoView({ behavior, block: 'center' });
    } else {
      document.getElementById('monitor-groups')?.scrollIntoView({ behavior, block: 'start' });
    }
  };

  return (
    <div className="card animate-enter mt-4 flex gap-3" role="alert">
      <span aria-hidden className="w-[3px] shrink-0 bg-down" />
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3.5 pr-4">
        <div className="min-w-0">
          <p className="eyebrow">当前故障 / OUTAGE</p>
          <p className="mt-1 text-sm leading-relaxed text-ink2">
            {downNames.length} 个服务不可用：{shown}
          </p>
        </div>
        <HudButton
          className="h-9 shrink-0 px-3 font-mono text-2xs uppercase tracking-wider"
          onClick={handleLocate}
        >
          定位故障项
        </HudButton>
      </div>
    </div>
  );
}
