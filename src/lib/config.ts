import type { MonitorGroupView } from './types';

function num(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export interface SiteLink {
  label: string;
  href: string;
}

export const siteConfig = {
  title: process.env.NEXT_PUBLIC_SITE_TITLE || '服务状态',
  description:
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
    '实时查看我们所有服务的可用性与响应时间',
  logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || '',
  /** 前端自动刷新间隔（毫秒） */
  refreshIntervalMs: num(process.env.NEXT_PUBLIC_REFRESH_INTERVAL, 60) * 1000,
  /** 服务端缓存时长（毫秒），与刷新间隔保持一致，避免触发 UptimeRobot 限速 */
  cacheTtlMs: Math.max(num(process.env.NEXT_PUBLIC_REFRESH_INTERVAL, 60), 30) * 1000,
  historyDays: Math.min(Math.max(num(process.env.NEXT_PUBLIC_HISTORY_DAYS, 90), 1), 90),
  timezone: process.env.NEXT_PUBLIC_TIMEZONE || 'Asia/Shanghai',
  showUrl: (process.env.NEXT_PUBLIC_SHOW_URL || 'true').toLowerCase() !== 'false',
  links: (process.env.NEXT_PUBLIC_LINKS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((item) => {
      const [label, href] = item.split('|');
      return { label: (label || '').trim(), href: (href || '').trim() };
    })
    .filter((l): l is SiteLink => Boolean(l.label && l.href)),
  /** 分组配置：{ 组名: [monitorId] } */
  groups: parseGroups(process.env.NEXT_PUBLIC_MONITOR_GROUPS || ''),
};

function parseGroups(raw: string): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  if (!raw) return out;
  for (const chunk of raw.split('|')) {
    const [name, ids] = chunk.split(':');
    if (!name || !ids) continue;
    const list = ids
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n));
    if (list.length) out[name.trim()] = list;
  }
  return out;
}

/** 依据配置把监控项分组成有序数组 */
export function applyGroups<T extends { id: number }>(
  monitors: T[],
  groups: Record<string, number[]>,
): { name: string; monitors: T[] }[] {
  const names = Object.keys(groups);
  if (!names.length) {
    return monitors.length ? [{ name: '全部服务', monitors }] : [];
  }
  const used = new Set<number>();
  const out: { name: string; monitors: T[] }[] = [];
  for (const name of names) {
    const ids = new Set(groups[name]);
    const items = monitors.filter((m) => ids.has(m.id));
    items.forEach((m) => used.add(m.id));
    if (items.length) out.push({ name, monitors: items });
  }
  const rest = monitors.filter((m) => !used.has(m.id));
  if (rest.length) out.push({ name: '其他', monitors: rest });
  return out;
}

export type { MonitorGroupView };
