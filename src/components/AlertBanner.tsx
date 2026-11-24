'use client';

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
    <div
      role="alert"
      className="animate-enter relative mt-6 overflow-hidden rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 backdrop-blur-xl shadow-glow-down transition-all"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-500">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-sans text-xs font-bold uppercase tracking-wider text-rose-500">
                服务中断告警
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
            </div>
            <p className="mt-0.5 text-xs text-ink sm:text-sm">
              检测到 <strong className="font-semibold text-rose-500">{downNames.length}</strong> 个服务异常：{shown}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLocate}
          className="rounded-full bg-rose-500 px-4 py-1.5 font-sans text-xs font-semibold text-white shadow-md shadow-rose-500/30 transition-all hover:bg-rose-600 hover:scale-105 active:scale-95"
        >
          定位故障服务
        </button>
      </div>
    </div>
  );
}
