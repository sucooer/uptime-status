import type {
  DayCell,
  DayState,
  Incident,
  MonitorState,
  MonitorView,
  OverallState,
  StatusStats,
  URLog,
  URMonitor,
} from './types';
import { recentDayStarts, startOfDay } from './time';

const TYPE_LABEL: Record<number, string> = {
  1: 'HTTP(S)',
  2: '关键字',
  3: 'Ping',
  4: '端口',
  5: '心跳',
};

const STATE_BY_STATUS: Record<number, MonitorState> = {
  0: 'paused',
  1: 'pending',
  2: 'up',
  8: 'down',
  9: 'down',
};

export function stateOf(status: number): MonitorState {
  return STATE_BY_STATUS[status] ?? 'pending';
}

export function typeLabelOf(type: number): string {
  return TYPE_LABEL[type] || `类型 ${type}`;
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** 把 "99.86-100.00-99.98" 这类字符串按 1/7/30/90 天顺序解析 */
export function parseUptimeRatios(raw?: string) {
  const parts = (raw || '').split('-').map((s) => toNum(s.trim()));
  return {
    d1: parts[0] ?? null,
    d7: parts[1] ?? null,
    d30: parts[2] ?? null,
    d90: parts[3] ?? null,
  };
}

export interface DowntimeInterval {
  start: number;
  end: number | null;
  reasonCode: string | null;
  reasonText: string | null;
  /** 日志自带的持续秒数，比 end-start 更准确 */
  durationFromLog: number | null;
}

/** 解析日志中的故障原因，兼容 v2 的 reason 对象与旧版的扁平字段 */
export function parseReason(log: URLog): { code: string | null; text: string | null } {
  const raw = log.reason;
  let code: string | null = null;
  let detail: string | null = null;

  if (typeof raw === 'string') {
    code = raw.trim() || null;
  } else if (raw) {
    code = raw.code === undefined || raw.code === null ? null : String(raw.code).trim() || null;
    detail = (raw.detail || '').trim() || null;
  }
  if (!detail && log.reason_detail) detail = log.reason_detail.trim() || null;

  return { code, text: detail || code };
}

/** 由日志序列还原出故障区间（升序） */
export function buildIntervals(logs: URLog[] = []): DowntimeInterval[] {
  const asc = [...logs].sort((a, b) => a.datetime - b.datetime);
  const out: DowntimeInterval[] = [];
  let open: DowntimeInterval | null = null;

  for (const log of asc) {
    if (log.type === 1) {
      if (open === null) {
        const { code, text } = parseReason(log);
        open = {
          start: log.datetime,
          end: null,
          reasonCode: code,
          reasonText: text,
          durationFromLog: log.duration && log.duration > 0 ? log.duration : null,
        };
      }
    } else if (log.type === 2 || log.type === 3 || log.type === 98 || log.type === 99) {
      if (open !== null) {
        if (log.datetime >= open.start) {
          open.end = log.datetime;
          // 恢复日志有时也带 duration，作为兜底
          if (!open.durationFromLog && log.duration && log.duration > 0) {
            open.durationFromLog = log.duration;
          }
          out.push(open);
        }
        open = null;
      }
    }
  }
  if (open !== null) out.push(open);
  return out;
}

/** 统一的故障时长计算：优先用日志自带 duration */
function intervalDuration(iv: DowntimeInterval): number | null {
  if (iv.end) return iv.durationFromLog ?? iv.end - iv.start;
  return null;
}

function classifyDay(downSeconds: number, span: number): DayState {
  if (downSeconds <= 0) return 'up';
  // 当天故障不足 5 分钟视为轻微波动
  if (downSeconds < 300) return 'degraded';
  const ratio = 1 - downSeconds / span;
  if (ratio >= 0.99) return 'degraded';
  return 'down';
}

/** 计算最近 days 天，每天的可用状态 */
export function buildDayCells(
  intervals: DowntimeInterval[],
  days: number,
  now: number,
  timeZone: string,
  createdAt: number,
): DayCell[] {
  const starts = recentDayStarts(days, now, timeZone);
  const createdDay = startOfDay(createdAt * 1000, timeZone);
  const cells: DayCell[] = [];

  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    // 最后一天只统计到当前时刻
    const end = i === starts.length - 1 ? now : starts[i + 1];
    const span = Math.max(end - start, 1);

    if (start + 1000 < createdDay) {
      cells.push({ start, state: 'nodata', downSeconds: 0, uptime: null });
      continue;
    }

    let downSeconds = 0;
    for (const iv of intervals) {
      const ivEnd = iv.end ?? now;
      const from = Math.max(iv.start * 1000, start);
      const to = Math.min(ivEnd * 1000, end);
      if (to > from) downSeconds += (to - from) / 1000;
    }
    downSeconds = Math.min(downSeconds, span / 1000);

    cells.push({
      start,
      state: classifyDay(downSeconds, span / 1000),
      downSeconds,
      uptime: Math.max(0, (1 - downSeconds / (span / 1000)) * 100),
    });
  }
  return cells;
}

export function buildMonitorView(
  raw: URMonitor,
  now: number,
  historyDays: number,
  timeZone: string,
): MonitorView {
  const ratios = parseUptimeRatios(raw.custom_uptime_ratio);
  const intervals = buildIntervals(raw.logs);
  const days = buildDayCells(
    intervals,
    historyDays,
    now,
    timeZone,
    raw.create_datetime || 0,
  );

  const responseSeries = (raw.response_times || [])
    .filter((r) => r.value !== null && r.value > 0)
    .map((r) => ({ t: r.datetime, v: r.value as number }))
    .sort((a, b) => a.t - b.t);

  const incidents: Incident[] = intervals
    .map((iv) => ({
      monitorId: raw.id,
      monitorName: raw.friendly_name,
      monitorType: typeLabelOf(raw.type),
      start: iv.start,
      end: iv.end,
      durationSeconds: intervalDuration(iv),
      reasonCode: iv.reasonCode,
      reasonText: iv.reasonText,
    }))
    .sort((a, b) => b.start - a.start);

  return {
    id: raw.id,
    name: raw.friendly_name,
    url: raw.url || null,
    typeLabel: typeLabelOf(raw.type),
    state: stateOf(raw.status),
    rawStatus: raw.status,
    interval: raw.interval,
    createdAt: raw.create_datetime || 0,
    uptime: {
      ...ratios,
      all: toNum(raw.all_time_uptime_ratio),
    },
    avgResponseMs: toNum(raw.average_response_time),
    lastResponseMs: responseSeries.length
      ? responseSeries[responseSeries.length - 1].v
      : null,
    responseSeries,
    days,
    incidents,
    sslExpires: raw.ssl?.expires ? raw.ssl.expires : null,
  };
}

export function buildStats(monitors: MonitorView[]): StatusStats {
  const total = monitors.length;
  const up = monitors.filter((m) => m.state === 'up').length;
  const down = monitors.filter((m) => m.state === 'down').length;
  const paused = monitors.filter((m) => m.state === 'paused' || m.state === 'pending').length;

  const ups = monitors.map((m) => m.uptime.d1).filter((v): v is number => v !== null);
  const resps = monitors
    .map((m) => m.avgResponseMs)
    .filter((v): v is number => v !== null && v > 0);

  return {
    total,
    up,
    down,
    paused,
    avgUptime24h: ups.length ? ups.reduce((a, b) => a + b, 0) / ups.length : null,
    avgResponseMs: resps.length ? resps.reduce((a, b) => a + b, 0) / resps.length : null,
  };
}

export function buildOverall(
  monitors: MonitorView[],
  stats: StatusStats,
  now: number,
): OverallState {
  if (!monitors.length) return 'unknown';
  if (stats.down > 0) return 'down';
  // 24 小时内发生过故障，但当前均已恢复
  const recent = monitors.some((m) =>
    m.incidents.some((i) => i.start * 1000 >= now - 24 * 3600 * 1000),
  );
  return recent ? 'degraded' : 'up';
}
