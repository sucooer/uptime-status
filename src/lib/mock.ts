import { buildMonitorView, buildOverall, buildStats } from './aggregate';
import { applyGroups, siteConfig } from './config';
import type { StatusPayload, URLog, URMonitor } from './types';

/** 确定性伪随机，保证每次渲染结果一致 */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const DEMO_SEEDS = [
  { id: 781234501, name: '主站 Website', url: 'https://example.com', type: 1, status: 2, base: 210 },
  { id: 781234502, name: 'API 服务', url: 'https://api.example.com/health', type: 2, status: 2, base: 130 },
  { id: 781234503, name: 'CDN 节点', url: 'https://cdn.example.com', type: 1, status: 2, base: 62 },
  { id: 781234504, name: '数据库端口', url: 'db.example.com', type: 4, status: 2, base: 24 },
  { id: 781234505, name: '后台管理', url: 'https://admin.example.com', type: 1, status: 9, base: 340 },
];

/** 无 API Key 时的演示数据，方便先部署看效果 */
export function demoPayload(): StatusPayload {
  const now = Math.floor(Date.now() / 1000);
  const rnd = seeded(20240912);

  const monitors: URMonitor[] = DEMO_SEEDS.map((seed) => {
    const created = now - 220 * 86400;
    const responseTimes: { datetime: number; value: number }[] = [];
    for (let i = 0; i < 288; i++) {
      const t = now - (288 - i) * 300;
      const v = Math.max(8, Math.round(seed.base * (0.75 + rnd() * 0.6)));
      responseTimes.push({ datetime: t, value: v });
    }
    responseTimes.sort((a, b) => b.datetime - a.datetime);

    const logs: URLog[] = [
      {
        type: 1,
        datetime: now - 20 * 86400,
        duration: 1840,
        reason: { code: '503', detail: 'Service Unavailable' },
      },
      { type: 2, datetime: now - 20 * 86400 + 1840 },
      {
        type: 1,
        datetime: now - 6 * 86400,
        duration: 420,
        reason: { code: 'TIMEOUT', detail: 'Connection timed out after 30s' },
      },
      { type: 2, datetime: now - 6 * 86400 + 420 },
    ];
    if (seed.status === 9) {
      logs.unshift({
        type: 1,
        datetime: now - 1800,
        reason: { code: '502', detail: 'Bad Gateway' },
      });
    }

    return {
      id: seed.id,
      friendly_name: seed.name,
      url: seed.url,
      type: seed.type,
      interval: 300,
      status: seed.status,
      create_datetime: created,
      custom_uptime_ratio:
        seed.status === 9 ? '99.10-99.72-99.86-99.91' : '100.00-99.98-99.99-99.99',
      all_time_uptime_ratio: seed.status === 9 ? '99.84' : '99.99',
      average_response_time: String(seed.base),
      response_times: responseTimes,
      logs,
    };
  });

  const views = monitors.map((m) =>
    buildMonitorView(m, Date.now(), siteConfig.historyDays, siteConfig.timezone),
  );
  const stats = buildStats(views);
  const overall = buildOverall(views, stats, Date.now());

  return {
    ok: true,
    demo: true,
    error: null,
    updatedAt: Date.now(),
    overall,
    groups: applyGroups(views, siteConfig.groups),
    stats,
    incidents: views
      .flatMap((m) => m.incidents)
      .sort((a, b) => b.start - a.start)
      .slice(0, 20),
    historyDays: siteConfig.historyDays,
  };
}
