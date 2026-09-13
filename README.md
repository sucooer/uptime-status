# UptimeRobot Status Page

基于 [UptimeRobot API v2](https://uptimerobot.com/api/) 的服务状态页。Next.js 15 App Router + Tailwind CSS，
服务端取数、Edge Runtime，可部署到 Vercel 或 Cloudflare Pages。

## 特性

- 总览状态横幅：正常 / 波动 / 中断，含监控项数量与 24h 平均可用率
- 90 天可用性日历条，按天聚合，悬停可查看中断时长
- 单监控项指标：24h / 7d / 30d 可用率、平均响应、响应时间趋势图、近期事件
- 全局近期事件时间线
- 服务端 60s 内存缓存 + 请求去重，规避 UptimeRobot 限速
- 60s 自动增量刷新，无需整页重载
- 深浅色主题，跟随系统且无首屏闪烁
- 响应式布局
- `/api/status` JSON 接口，便于二次集成

## 快速开始

```bash
npm install
export UPTIMEROBOT_API_KEY=<read-only-key>
npm run dev
```

打开 http://localhost:3000

API Key 获取：UptimeRobot 控制台 → `My Settings` → `API Settings` → **Read-Only Key**。

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `UPTIMEROBOT_API_KEY` | 生产必填 | — | 只读 API Key，仅在服务端读取 |
| `ENABLE_DEMO_MODE` | 否 | `false` | 允许在生产环境展示演示数据 |
| `NEXT_PUBLIC_SITE_TITLE` | 否 | `服务状态` | 站点标题 |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | 否 | — | 站点副标题 |
| `NEXT_PUBLIC_LOGO_URL` | 否 | — | Logo 地址 |
| `NEXT_PUBLIC_LINKS` | 否 | — | 页脚链接，格式 `文案\|网址`，逗号分隔 |
| `NEXT_PUBLIC_REFRESH_INTERVAL` | 否 | `60` | 刷新与缓存间隔（秒） |
| `NEXT_PUBLIC_HISTORY_DAYS` | 否 | `90` | 历史天数，1–90 |
| `NEXT_PUBLIC_TIMEZONE` | 否 | `Asia/Shanghai` | 用于时间展示与按天切分 |
| `NEXT_PUBLIC_SHOW_URL` | 否 | `true` | 是否展示监控地址 |
| `NEXT_PUBLIC_MONITOR_GROUPS` | 否 | — | 分组，格式 `组名:ID1,ID2\|组名2:ID3` |

### 密钥处理

`UPTIMEROBOT_API_KEY` 不含 `NEXT_PUBLIC_` 前缀，不会被打进前端产物，仅通过环境变量注入：

| 环境 | 配置位置 |
| --- | --- |
| Vercel | Project → Settings → Environment Variables |
| Cloudflare Pages | Settings → Environment variables（建议 Encrypt） |
| 本地 | `export UPTIMEROBOT_API_KEY=...` |

生产环境缺失该变量时页面显式报错，不会回退演示数据。

### 优先级

环境变量与 `.env` 文件可共存，环境变量优先（`.env` 不覆盖已存在的 `process.env` 值）：

```
环境变量 > .env.production.local > .env.local > .env.production > .env
```

## 部署

### Vercel

导入仓库，Framework Preset 选 Next.js，配置环境变量后 Deploy。

```bash
npx vercel --prod
```

### Cloudflare Pages

```bash
npm run pages:deploy
```

控制台配置：

- **Settings → Environment variables**：填写变量，注意 Production / Preview 需分别配置
- **Settings → Functions → Compatibility flags**：添加 `nodejs_compat`

Git 集成时使用：

- Build command: `npx @cloudflare/next-on-pages@1`
- Build output directory: `.vercel/output/static`

## API

`GET /api/status`

```jsonc
{
  "ok": true,
  "demo": false,
  "error": null,
  "updatedAt": 1730000000000,
  "overall": "up",                 // up | degraded | down | unknown
  "groups": [{ "name": "全部服务", "monitors": [] }],
  "stats": { "total": 5, "up": 5, "down": 0, "paused": 0, "avgUptime24h": 99.99, "avgResponseMs": 132 },
  "incidents": [],
  "historyDays": 90
}
```

## 项目结构

```
src/
  app/
    page.tsx              主页面
    api/status/route.ts   JSON 接口
    layout.tsx
    globals.css
  components/             UI 组件
  lib/
    uptimerobot.ts        API 请求、缓存、降级
    aggregate.ts          故障区间还原与按天聚合
    time.ts               时区切分与格式化
    config.ts             环境变量与分组
    mock.ts               演示数据
```

## 故障排查

### Windows 下 SWC 原生二进制加载失败

```
⚠ Attempted to load @next/swc-win32-x64-msvc, but an error occurred:
  A dynamic link library (DLL) initialization routine failed.
```

Next 加载编译器的策略是「先试原生二进制 → 失败则回退 WASM」。该提示表示原生二进制未能初始化，
Next 已自动改用 WASM 版 SWC，构建与运行不受影响，仅编译速度略慢。

该失败源于本机环境（安全软件或系统缓解策略拦截了 DLL 初始化），与项目代码无关，
不影响构建与运行，忽略这条提示即可。

## 已知限制

- UptimeRobot 免费版限速约 10 次/分钟，刷新间隔建议不低于 60 秒
- 90 天历史由状态变更日志还原，日志最多返回 100 条，抖动频繁的服务较早日期可能显示为无数据
- 免费版最短检测间隔 5 分钟，响应时间曲线粒度受此限制
- `getMonitors` 不返回分组信息，分组需手动配置监控 ID

## License

MIT
