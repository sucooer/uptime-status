import { applyGroups, siteConfig } from './config';
import { buildMonitorView, buildOverall, buildStats } from './aggregate';
import { demoPayload } from './mock';
import type { StatusPayload, URMonitor, URResponse } from './types';

const API_ENDPOINT = 'https://api.uptimerobot.com/v2/getMonitors';

interface CacheEntry {
  expires: number;
  payload: StatusPayload;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<StatusPayload>>();

export async function fetchMonitors(apiKey: string): Promise<URMonitor[]> {
  const body = new URLSearchParams();
  body.set('api_key', apiKey);
  body.set('format', 'json');
  // 日志：只取最近 90 天，最多 100 条（从新到旧）
  body.set('logs', '1');
  body.set('logs_limit', '100');
  body.set('logs_start_date', String(Math.floor(Date.now() / 1000) - 90 * 86400));
  // 响应时间序列
  body.set('response_times', '1');
  body.set('response_times_limit', '300');
  // 自定义可用率区间（天）
  body.set('custom_uptime_ratios', '1-7-30-90');
  body.set('all_time_uptime_ratio', '1');
  body.set('ssl', '1');

  const res = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-cache',
    },
    body: body.toString(),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`UptimeRobot 返回 HTTP ${res.status}`);
  }

  const data = (await res.json()) as URResponse;
  if (data.stat !== 'ok') {
    throw new Error(data.error?.message || 'UptimeRobot 接口调用失败');
  }
  return data.monitors || [];
}

function buildPayload(monitors: URMonitor[]): StatusPayload {
  const now = Date.now();
  const views = monitors
    .map((m) => buildMonitorView(m, now, siteConfig.historyDays, siteConfig.timezone))
    .sort((a, b) => {
      // 故障优先，其次按名称
      if (a.state === 'down' && b.state !== 'down') return -1;
      if (b.state === 'down' && a.state !== 'down') return 1;
      return a.name.localeCompare(b.name, 'zh-CN');
    });

  const stats = buildStats(views);
  const overall = buildOverall(views, stats, now);
  const incidents = views
    .flatMap((m) => m.incidents)
    .sort((a, b) => b.start - a.start)
    .slice(0, 20);

  return {
    ok: true,
    demo: false,
    error: null,
    updatedAt: now,
    overall,
    groups: applyGroups(views, siteConfig.groups),
    stats,
    incidents,
    historyDays: siteConfig.historyDays,
  };
}

function errorPayload(message: string): StatusPayload {
  return {
    ok: false,
    demo: false,
    error: message,
    updatedAt: Date.now(),
    overall: 'unknown' as const,
    groups: [],
    stats: { total: 0, up: 0, down: 0, paused: 0, avgUptime24h: null, avgResponseMs: null },
    incidents: [],
    historyDays: siteConfig.historyDays,
  };
}

async function load(): Promise<StatusPayload> {
  // 密钥只从运行时环境变量读取，禁止写入任何 .env 文件
  const apiKey = (process.env.UPTIMEROBOT_API_KEY || '').trim();

  if (!apiKey) {
    // 演示数据仅限本地开发；线上缺密钥必须显式报错，绝不能让访客误看假数据
    const demoAllowed =
      process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEMO_MODE === 'true';
    if (demoAllowed) return demoPayload();
    return errorPayload(
      '未检测到环境变量 UPTIMEROBOT_API_KEY，请在部署平台的环境变量中配置（不要写入 .env 文件）。',
    );
  }

  const now = Date.now();
  const key = `${apiKey.slice(0, 8)}:${siteConfig.historyDays}:${siteConfig.timezone}`;
  const hit = cache.get(key);
  if (hit && hit.expires > now) return hit.payload;

  const running = inflight.get(key);
  if (running) return running;

  const task = (async () => {
    try {
      const monitors = await fetchMonitors(apiKey);
      const payload = buildPayload(monitors);
      cache.set(key, { expires: Date.now() + siteConfig.cacheTtlMs, payload });
      return payload;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // 出错时如果有旧数据，降级返回旧数据，避免整页崩掉
      const stale = cache.get(key);
      if (stale) return { ...stale.payload, error: message };
      return errorPayload(message);
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, task);
  return task;
}

/** 页面与 API 共用的数据入口（带内存缓存） */
export async function getStatus(): Promise<StatusPayload> {
  return load();
}
