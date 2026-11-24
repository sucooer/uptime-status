import { siteConfig } from '@/lib/config';
import { getStatus } from '@/lib/uptimerobot';
import { mergeDays } from '@/lib/mergeDays';
import { OverallHero } from '@/components/OverallHero';
import { MonitorGrid } from '@/components/MonitorGrid';
import { StateToast } from '@/components/StateToast';
import { RefreshBar } from '@/components/RefreshBar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SiteLogo } from '@/components/SiteLogo';
import { AlertBanner } from '@/components/AlertBanner';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const linkClass =
  'text-subtle transition-colors duration-200 hover:text-accent hover:underline decoration-accent/40 underline-offset-4';

export default async function Home() {
  const data = await getStatus();
  const globalDays = mergeDays(data.groups, data.historyDays);
  const downNames = data.groups.flatMap((g) => g.monitors).filter((m) => m.state === 'down').map((m) => m.name);
  const stateSnapshot = data.groups.flatMap((g) => g.monitors).map((m) => ({ id: m.id, name: m.name, state: m.state }));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6 sm:px-6">
      {/* 顶部：站点品牌与控制中枢 */}
      <header className="animate-enter border-b border-line/40 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <SiteLogo src={siteConfig.logoUrl} />
            <div className="min-w-0">
              <h2 className="truncate font-sans text-lg font-bold tracking-tight text-ink sm:text-xl">
                {siteConfig.title}
              </h2>
              <p className="mt-0.5 truncate font-sans text-xs text-subtle">
                {siteConfig.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <RefreshBar updatedAt={data.updatedAt} intervalMs={siteConfig.refreshIntervalMs} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* 演示模式提醒 */}
      {data.demo && (
        <Notice
          tone="accent"
          label="演示数据模式"
          body={
            <>
              未检测到环境变量 <Code>UPTIMEROBOT_API_KEY</Code>，当前展示示例模拟数据。本地请执行{' '}
              <Code>export UPTIMEROBOT_API_KEY=…</Code> 后重启服务；线上请在部署平台环境变量中配置。
            </>
          }
        />
      )}

      {/* 数据获取错误提醒 */}
      {data.error && (
        <Notice
          tone="down"
          label="数据同步异常"
          body={
            <>
              {data.error}
              {data.groups.length > 0 && (
                <span className="ml-1 text-subtle">（当前显示上一次成功的本地缓存）</span>
              )}
            </>
          }
        />
      )}

      {/* 故障全局告警横幅 */}
      {data.overall === 'down' && downNames.length > 0 && <AlertBanner downNames={downNames} />}

      {/* 核心看板 */}
      {data.groups.length > 0 ? (
        <OverallHero
          overall={data.overall}
          stats={data.stats}
          days={globalDays}
          historyDays={data.historyDays}
          timezone={siteConfig.timezone}
        />
      ) : (
        <div className="card mt-8 p-12 text-center">
          <p className="eyebrow">暂无可用数据</p>
          <p className="mt-2 text-sm text-subtle">
            未发现可展示的监控项，请确认已在部署平台正确注入 <Code>UPTIMEROBOT_API_KEY</Code>。
          </p>
        </div>
      )}

      {/* 监控项网格列表 */}
      {data.groups.length > 0 && (
        <MonitorGrid
          groups={data.groups}
          timezone={siteConfig.timezone}
          showUrl={siteConfig.showUrl}
          historyDays={data.historyDays}
        />
      )}

      {/* 页脚 */}
      <footer className="mt-20 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line/40 pt-6 font-sans text-xs text-subtle">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span>
            遥测数据由{' '}
            <a className={linkClass} href="https://uptimerobot.com" target="_blank" rel="noreferrer">
              UptimeRobot
            </a>{' '}
            驱动
          </span>
          {siteConfig.links.map((l) => (
            <a key={l.href} className={linkClass} href={l.href} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          ))}
          <a
            className={linkClass}
            href="https://github.com/sucooer/uptime-status"
            target="_blank"
            rel="noreferrer"
          >
            <span className="inline-flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub
            </span>
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-subtle">
          <span className="tnum">每 {Math.round(siteConfig.refreshIntervalMs / 1000)}s 智能增量同步</span>
          <span className="opacity-40">·</span>
          <span>
            Copyright © {copyrightYear()}{' '}
            <a className={linkClass} href="https://suis.ren" target="_blank" rel="noreferrer">
              sucooer
            </a>
          </span>
        </div>
      </footer>

      <StateToast snapshot={stateSnapshot} />
    </main>
  );
}

function copyrightYear(): string {
  const startYear = 2026;
  const currentYear = new Date().getFullYear();
  return currentYear > startYear ? `${startYear} - ${currentYear}` : String(startYear);
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-md border border-line/60 bg-surface2 px-1.5 py-0.5 font-mono text-xs text-ink font-medium">
      {children}
    </code>
  );
}

function Notice({
  tone,
  label,
  body,
}: {
  tone: 'accent' | 'down';
  label: string;
  body: React.ReactNode;
}) {
  const isDown = tone === 'down';
  return (
    <div
      className={`animate-enter mt-5 flex items-start gap-3.5 rounded-2xl border p-4 backdrop-blur-xl transition-all ${
        isDown
          ? 'border-rose-500/30 bg-rose-500/10 shadow-glow-down'
          : 'border-accent/30 bg-accent/10 shadow-glow-accent'
      }`}
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isDown ? 'bg-rose-500/20 text-rose-500' : 'bg-accent/20 text-accent'
        }`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div className="min-w-0">
        <p className={`font-sans text-xs font-semibold ${isDown ? 'text-rose-500' : 'text-accent'}`}>
          {label}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-ink2">{body}</p>
      </div>
    </div>
  );
}
