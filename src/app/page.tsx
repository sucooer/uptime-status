import { siteConfig } from '@/lib/config';
import { getStatus } from '@/lib/uptimerobot';
import { mergeDays, OverallHero } from '@/components/OverallHero';
import { MonitorCard } from '@/components/MonitorCard';
import { IncidentList } from '@/components/IncidentList';
import { RefreshBar } from '@/components/RefreshBar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SiteLogo } from '@/components/SiteLogo';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const linkClass =
  'text-ink2 underline decoration-line-strong decoration-1 underline-offset-2 transition-colors hover:text-accent hover:decoration-accent';

export default async function Home() {
  const data = await getStatus();
  const globalDays = mergeDays(data.groups, data.historyDays);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-6">
      {/* 顶部：站点标识 + 控件 */}
      <header className="mb-7 border-b divider pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <SiteLogo src={siteConfig.logoUrl} />
            <div>
              <h2 className="text-base font-semibold leading-tight tracking-tight">{siteConfig.title}</h2>
              <p className="mt-0.5 text-xs text-subtle">{siteConfig.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <RefreshBar updatedAt={data.updatedAt} intervalMs={siteConfig.refreshIntervalMs} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {data.demo && <Notice tone="accent" label="演示模式" body={<>未检测到环境变量 <Code>UPTIMEROBOT_API_KEY</Code>，当前展示示例数据。本地执行 <Code>export UPTIMEROBOT_API_KEY=…</Code> 后重启；线上请在部署平台的环境变量中配置，不要写入 .env 文件。</>} />}

      {data.error && <Notice tone="down" label="数据获取异常" body={<>{data.error}{data.groups.length > 0 && <span className="ml-1 text-subtle">（当前显示上一次成功的缓存）</span>}</>} />}

      {data.groups.length > 0 ? (
        <OverallHero
          overall={data.overall}
          stats={data.stats}
          days={globalDays}
          historyDays={data.historyDays}
          timezone={siteConfig.timezone}
        />
      ) : (
        <div className="card px-5 py-8 text-center">
          <p className="font-mono text-2xs uppercase tracking-label text-subtle">无数据</p>
          <p className="mt-1.5 text-sm text-ink2">
            暂无可展示的监控项，请确认环境变量 <Code>UPTIMEROBOT_API_KEY</Code> 已在部署平台配置。
          </p>
        </div>
      )}

      {/* 监控项分组 */}
      {data.groups.map((group) => (
        <section key={group.name} className="mt-9">
          <SectionTitle title={group.name} count={group.monitors.length} />
          <div className="grid gap-4 sm:grid-cols-2">
            {group.monitors.map((m, idx) => (
              <div
                key={m.id}
                className={`animate-enter ${idx < 5 ? `stagger-${idx + 1}` : ''}`}
                style={{ opacity: 0 }}
              >
                <MonitorCard
                  monitor={m}
                  timezone={siteConfig.timezone}
                  showUrl={siteConfig.showUrl}
                  historyDays={data.historyDays}
                />
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* 近期事件 */}
      <section className="mt-9">
        <SectionTitle title="近期事件" count={data.incidents.length} />
        <IncidentList
          incidents={data.incidents}
          timezone={siteConfig.timezone}
          historyDays={data.historyDays}
        />
      </section>

      <footer className="mt-12 border-t divider pt-5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 font-mono text-2xs uppercase tracking-wider text-subtle">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              数据来自{' '}
              <a className={linkClass} href="https://uptimerobot.com" target="_blank" rel="noreferrer">
                UptimeRobot
              </a>
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
              <span className="inline-flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                GitHub
              </span>
            </a>
          </div>
          <span className="tnum">每 {Math.round(siteConfig.refreshIntervalMs / 1000)} 秒自动刷新</span>
        </div>
      </footer>
    </main>
  );
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <h3 className="mb-3 flex items-baseline gap-2">
      <span className="eyebrow">{title}</span>
      <span className="font-mono text-2xs tnum text-subtle">[{count}]</span>
      <span aria-hidden className="rule mb-1 flex-1" />
    </h3>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded border border-line bg-surface2 px-1 py-px font-mono text-2xs text-ink2">
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
  const rail = tone === 'down' ? 'bg-down' : 'bg-accent';
  return (
    <div className="card mb-4 flex gap-3 overflow-hidden">
      <span aria-hidden className={`w-[3px] shrink-0 ${rail}`} />
      <div className="py-3.5 pr-4">
        <p className="font-mono text-2xs uppercase tracking-label text-subtle">{label}</p>
        <p className="mt-1 text-sm leading-relaxed text-ink2">{body}</p>
      </div>
    </div>
  );
}
