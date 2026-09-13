/** 时区相关工具：把 UTC 时间戳按指定时区切分成「天」 */

const partCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = partCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    partCache.set(timeZone, f);
  }
  return f;
}

/** 指定时区相对 UTC 的偏移（毫秒） */
export function tzOffsetMs(ts: number, timeZone: string): number {
  const parts = formatter(timeZone).formatToParts(new Date(ts));
  const map: Record<string, number> = {};
  for (const p of parts) map[p.type] = Number(p.value);
  const asUTC = Date.UTC(
    map.year,
    map.month - 1,
    map.day,
    map.hour % 24,
    map.minute,
    map.second,
  );
  return asUTC - (ts - (ts % 1000));
}

/** 时间戳所在「自然日」的 00:00（返回 UTC 时间戳） */
export function startOfDay(ts: number, timeZone: string): number {
  const parts = formatter(timeZone).formatToParts(new Date(ts));
  const map: Record<string, number> = {};
  for (const p of parts) map[p.type] = Number(p.value);
  const guess = Date.UTC(map.year, map.month - 1, map.day, 0, 0, 0);
  // 用 guess 自身的偏移修正一次，即可兼容夏令时切换
  return guess - tzOffsetMs(guess, timeZone);
}

/** 生成最近 days 天的日起点（升序），最后一项为今天 */
export function recentDayStarts(days: number, now: number, timeZone: string): number[] {
  const starts: number[] = [];
  let cursor = startOfDay(now, timeZone);
  for (let i = 0; i < days; i++) {
    starts.unshift(cursor);
    cursor = startOfDay(cursor - 12 * 3600 * 1000, timeZone);
  }
  return starts;
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();

/** 固定时区的确定性时间格式化（避免 SSR / CSR 水合不一致） */
export function formatTime(
  ts: number,
  timeZone: string,
  opts: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  },
): string {
  const key = timeZone + JSON.stringify(opts);
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat('zh-CN', { timeZone, ...opts });
    fmtCache.set(key, f);
  }
  return f.format(new Date(ts));
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} 秒`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} 分钟`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (h < 24) return rm ? `${h} 小时 ${rm} 分钟` : `${h} 小时`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d} 天 ${rh} 小时` : `${d} 天`;
}
