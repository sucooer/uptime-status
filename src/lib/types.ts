/* UptimeRobot API v2 相关类型定义 */

export interface URLog {
  type: number;
  datetime: number;
  /** 该条日志对应的持续秒数（down 日志即中断时长） */
  duration?: number;
  /** v2 为对象；少数来源为纯字符串 */
  reason?: { code?: string | number; detail?: string } | string;
  /** 兼容旧版扁平字段 */
  reason_detail?: string;
}

export interface URResponseTime {
  datetime: number;
  value: number | null;
}

export interface URSSL {
  brand?: string;
  product?: string;
  expires?: number;
}

export interface URMonitor {
  id: number;
  friendly_name: string;
  url?: string;
  type: number;
  sub_type?: string;
  keyword_type?: string;
  keyword_value?: string;
  port?: number;
  interval: number;
  status: number;
  create_datetime: number;
  custom_uptime_ratio?: string;
  custom_uptime_ranges?: string;
  all_time_uptime_ratio?: string;
  average_response_time?: string;
  response_times?: URResponseTime[];
  logs?: URLog[];
  ssl?: URSSL;
}

export interface URResponse {
  stat: 'ok' | 'fail';
  error?: { type?: string; message?: string };
  pagination?: { offset: number; limit: number; total: number };
  monitors?: URMonitor[];
}

/* ------------------------------ 视图层类型 ------------------------------ */

export type MonitorState = 'up' | 'down' | 'paused' | 'pending';
export type OverallState = 'up' | 'degraded' | 'down' | 'unknown';
export type DayState = 'up' | 'degraded' | 'down' | 'nodata';

export interface DayCell {
  /** 当天 00:00（UTC 时间戳） */
  start: number;
  state: DayState;
  /** 当天故障持续秒数 */
  downSeconds: number;
  /** 当天可用率 0-100，无数据为 null */
  uptime: number | null;
}

export interface Incident {
  monitorId: number;
  monitorName: string;
  /** 监控类型，如 HTTP(S) / 关键字 */
  monitorType: string;
  start: number;
  /** 仍未恢复则为 null */
  end: number | null;
  durationSeconds: number | null;
  /** 故障原因代码，如 500、TIMEOUT */
  reasonCode: string | null;
  /** 故障原因描述，如 Internal Server Error */
  reasonText: string | null;
}

export interface MonitorView {
  id: number;
  name: string;
  url: string | null;
  typeLabel: string;
  state: MonitorState;
  rawStatus: number;
  interval: number;
  createdAt: number;
  uptime: {
    d1: number | null;
    d7: number | null;
    d30: number | null;
    d90: number | null;
    all: number | null;
  };
  avgResponseMs: number | null;
  lastResponseMs: number | null;
  responseSeries: { t: number; v: number }[];
  days: DayCell[];
  incidents: Incident[];
  sslExpires: number | null;
}

export interface MonitorGroupView {
  name: string;
  monitors: MonitorView[];
}

export interface StatusStats {
  total: number;
  up: number;
  down: number;
  paused: number;
  avgUptime24h: number | null;
  avgResponseMs: number | null;
}

export interface StatusPayload {
  ok: boolean;
  demo: boolean;
  error: string | null;
  updatedAt: number;
  overall: OverallState;
  groups: MonitorGroupView[];
  stats: StatusStats;
  incidents: Incident[];
  historyDays: number;
}
