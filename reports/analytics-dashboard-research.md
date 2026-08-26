# 个人站点数据统计与仪表盘调研

日期：2026-07-09

## 问题描述

检查 TRPG Lucius Helper 当前项目结构，并调研个人前端 Web 站点的数据统计方式。目标指标包括页面曝光 PV/UV、点击事件 PV/UV、数据漏斗，以及来源 IP 地理热词面板（中国省级 / 国外国家级）。

## 核心结论

### 事实

- 当前主仓是 Vite + React + TypeScript 的静态 SPA。`README.md:3-5` 明确描述为静态 Web 工具站和纯前端应用；`package.json:18-24` 只有 Vite dev/build/preview、lint、type-check 等脚本，没有生产后端启动脚本。
- 路由集中在 `src/App.tsx`。`src/App.tsx:39-58` 显示主要页面位于 `TabLayout` 下，`/tools/*` 是工具箱嵌套路由，当前包含 `battle`、`world-wiki`、`soundboard`、`module-clue`、`ai-chat`。
- 导航菜单集中在 `src/components/TabLayout.tsx`。`toolItems` 位于 `src/components/TabLayout.tsx:7-13`，并被桌面菜单 `src/components/TabLayout.tsx:133-148` 和移动菜单 `src/components/TabLayout.tsx:307-320` 复用；当前没有 dashboard / analytics 入口。
- 当前没有成体系的 analytics / 埋点模块。`package.json:27-45` 没有 Umami、PostHog、Plausible、Matomo、GA、Recharts、ECharts、Leaflet、Mapbox 等依赖；`index.html:8-12` 只有 Live2D Cubism 脚本和 Vite 入口，没有 analytics script；全仓搜索 `analytics|umami|posthog|plausible|matomo|gtag|page_view|sendBeacon|recharts|echarts` 未发现真实埋点调用。
- 当前生产态主仓没有写入型后端。`docs/deploy-guide.md:121-157` 的 Nginx 示例是 `root` + `try_files` 静态 SPA；`scripts/wiki-admin-plugin.ts:37-39` 的写盘插件 `apply: "serve"`，只服务 Vite dev server。
- AI Gateway 是独立子仓服务，不是主仓内置后端。`repo.json:2-8` 定义父工程为 `vite-react-static-site`，`repo.json:17-24` 定义 `trpg-ai-gateway` 为独立子仓；`docs/localhost-ai-gateway-debug.md:15-24` 说明生产链路是 `issane.cn -> runtime.json -> ai.issane.cn -> Nginx -> 127.0.0.1:3001 -> trpg-ai-gateway`。

### 推断

- 如果只要最基础的页面访问 PV 和粗粒度 IP 来源，Nginx access log 可以作为低成本起点。但 Nginx 日志只能近似推断 UV（例如 IP + User-Agent），会受 NAT、代理、同网段多人、浏览器隐私策略影响；也无法覆盖 SPA 虚拟路由曝光、业务点击事件、漏斗步骤和登录用户维度。
- 如果目标是“收集原始数据并在项目内自定义展示”，应新增服务端采集与聚合能力：前端用 `navigator.sendBeacon` 或 `fetch(..., { keepalive: true })` 上报事件，服务端记录 JSONL / SQLite / Postgres，再通过 summary API 给仪表盘读取。
- 服务端可以放在现有 `trpg-ai-gateway` 子仓，也可以新建独立 analytics service。不能只放在当前静态前端里。
- `/tools/dashboard` 是结构上最自然的前端路由落点，但数据仪表盘不应作为公共工具裸露。至少需要 Gateway 鉴权、admin/KP token、Basic Auth 或 Nginx 访问限制。
- 来源 IP 与地理信息不能由浏览器可靠提供。应由服务端从 `remote_addr`、`X-Forwarded-For`、`CF-Connecting-IP` 等来源获取真实客户端 IP，再用 GeoIP 库、国内 IP 库、CDN 访客位置头或云日志服务做地理解析。

## 证据链

1. `src/App.tsx:1-18` 使用 React lazy 和 `react-router`，并懒加载 Profile、Toolbox、Blog 等页面。
2. `src/App.tsx:39-58` 显示 `/tools` 下已有工具箱子路由，新增仪表盘可挂 `path="dashboard"`。
3. `src/components/TabLayout.tsx:7-13` 的 `toolItems` 是工具菜单单一来源；新增可见入口需改这里。
4. `src/pages/ToolboxTab/index.tsx:14-18` 只是 `Suspense` + `Outlet` 容器，适合继续承载 `/tools/dashboard`。
5. `README.md:155-175` 的数据流只到 Nginx、dist 静态文件、public 静态内容和 localStorage / IndexedDB。
6. `docs/deploy-guide.md:259-277` 的 `/api/` 反代只是“未来多服务扩展”示例，不代表当前主站已有生产 API。
7. `src/features/ai/ai-gateway-client.ts:72-121` 显示前端通过 `/config/runtime.json` 获取 `aiGatewayUrl` 后跨服务调用 Gateway；`src/features/ai/ai-gateway-client.ts:124-207` 的现有 API 是 session、npcs、chat、module-clues，不是 analytics。
8. `src/index.css:1-75` 和 `components.json:1-20` 表明项目是 Tailwind v4 + shadcn 风格 CSS variables + lucide 图标。

## 方案对比

### 方案 A：Nginx 日志分析

适合：只看静态资源请求、入口路径、粗略来源、IP 地理分布。

优点：不改前端，不加依赖，已有 Nginx access log。

缺点：SPA 内部路由、点击、漏斗无法可靠获得；UV 只能近似；需要日志解析、去 bot、IP 地理解析。

### 方案 B：第三方或自托管 analytics

适合：快速得到可用报表，少写服务端。

- Umami：轻量，官方 tracker 支持 pageview、自定义 event、identify。
- Plausible：极简，custom event 需要先配置 goal；适合轻量转化目标。
- PostHog：产品分析能力强，funnel 支持事件步骤、过滤、breakdown；更重。
- Matomo：传统 Web analytics 能力完整，可自托管；维护成本更高。

注意：原始数据所有权取决于 SaaS 还是自托管部署，不能一概而论。

### 方案 C：自建极简 analytics（推荐）

适合：你想保留原始事件、按自己口径做 PV/UV/点击/漏斗/地理面板，并和现有 Gateway 权限体系结合。

建议路径：

1. 前端新增 `src/features/analytics/analytics-client.ts`，提供 `trackPageView`、`trackClick`、`identify`、匿名 ID 和 session ID。
2. 新增 `AnalyticsRouteTracker`，在 React Router `useLocation` 变化时上报 `page_view`。React 18/19 StrictMode 开发态会导致 effect 重跑，埋点客户端需要按 `event_id` 或 pathname + timestamp 窗口去重。
3. 关键业务点击显式上报，不建议全站无差别 autocapture。优先：博客卡片、Wiki 词条、音效键盘、AI 对话入口、模组线索查看。
4. 服务端新增 `POST /api/analytics/events`，补全 IP、User-Agent、Referer、Geo 字段，前端不上传 IP。
5. 服务端新增 `GET /api/analytics/summary`，只返回聚合后的仪表盘数据，不返回原始 IP。
6. 仪表盘路由可放 `/tools/dashboard`，但必须加访问控制；如果没有权限体系，先放在 admin-only / dev-only 入口。

当前实现补充：

- 本地默认写入 `trpg-ai-gateway/.local/analytics/events.jsonl`。
- 生产 GitHub Actions 将 `ANALYTICS_ROOT_DIR` 指向 `/var/www/trpg-ai-gateway/shared/analytics`，实际事件文件为 `/var/www/trpg-ai-gateway/shared/analytics/events.jsonl`。该目录位于 `current` / `releases/<sha>` 之外，不会随每次部署 release 切换而覆盖。
- `ANALYTICS_MAX_EVENTS` 默认 `20000`，超过上限时保留最近事件并裁掉最旧事件，避免个人站点统计文件无限增长。

## 数据模型建议

原始事件表：

```text
event_id
event_name
event_time
anonymous_id
session_id
user_id_hash / player_id_hash
page_path
page_url
page_title
referrer
utm_source
utm_medium
utm_campaign
element_id
element_text
component_name
entity_type
entity_id
properties_json
server_ip_hash
geo_country_iso
geo_region_iso
geo_region_name
geo_city
user_agent
device_type
browser
os
```

口径：

- 页面 PV：`event_name = page_view` 按 `page_path` 聚合次数。
- 页面 UV：`distinct anonymous_id` 或登录后 `distinct user_id_hash`；匿名 ID 受清缓存、跨设备、隐私模式影响。
- 点击 PV：`event_name = click` 按 `element_id` / `action_name` 聚合次数。
- 点击 UV：同一点击事件下 `distinct anonymous_id` / `user_id_hash`。
- 漏斗：对同一主体按 `event_time` 判断步骤是否顺序完成；可输出每步人数、相对转化率、总体转化率和中位耗时。
- 地理热词：`country_iso != CN` 时按国家聚合；`country_iso = CN` 时按 `geo_region_name` / 省份聚合。

## 仪表盘页面建议

前端落点：

- 新增 `src/pages/AnalyticsDashboardTab/index.tsx`
- `src/App.tsx` 新增 lazy import 和 `/tools/dashboard` route
- `src/components/TabLayout.tsx` 的 `toolItems` 新增“数据仪表盘”

页面结构：

- 顶部指标：总 PV、总 UV、今日 PV、今日 UV、点击事件数、漏斗总转化率。
- 趋势：PV/UV 折线或面积图。
- 点击排行：事件名 / 元素 ID 的 PV、UV、点击率。
- 漏斗：步骤条或漏斗图，显示每步人数、流失率、相对转化。
- 来源：Referer / UTM source 排名。
- 地理热词：先用条形榜和词云；地图可作为二期。

可视化依赖：

- 轻量图表优先 Recharts：更贴近 React，足够做折线、柱状、面积和简单漏斗近似。
- 如果要中国地图 / 世界地图 / 更复杂漏斗，优先 ECharts + `echarts-for-react`，再引入中国省级 GeoJSON。
- 当前项目没有地图 SDK，第一版不建议直接上地图；先用“省份 / 国家排名面板”更稳。

## 权限与隐私

- 仪表盘必须有访问控制，不能公开展示运营数据。
- 不展示原始 IP；存储时优先 hash 或只存派生地理字段。
- `ai-session-token`、登录 token、模型 key 绝不能进入事件日志。
- `playerId` 如需入库，应哈希化或只保存内部不可逆 ID。
- 支持 Do Not Track / 本地关闭开关，至少在隐私说明中声明统计用途。
- Bot 过滤要在服务端做，至少排除明显爬虫 User-Agent 和静态资源请求。

## 外部资料

- [Umami tracker functions](https://docs.umami.is/docs/tracker-functions)：支持 pageview、自定义 event、identify。
- [Plausible custom event goals](https://plausible.io/docs/custom-event-goals)：custom event 需要创建 matching goal，可带 props。
- [PostHog funnels](https://posthog.com/docs/product-analytics/funnels)：funnel 由事件步骤构成，支持顺序、过滤、breakdown。
- [Nginx log module](https://nginx.org/en/docs/http/ngx_http_log_module.html)：`combined` log 包含 remote address、request、status、referer、user agent。
- [Cloudflare HTTP headers](https://developers.cloudflare.com/fundamentals/reference/http-headers/)：`CF-Connecting-IP`、`X-Forwarded-For`、`CF-IPCountry` 可供源站使用。
- [MaxMind GeoIP City/Country](https://dev.maxmind.com/geoip/docs/databases/city-and-country/)：可根据 IPv4/IPv6 解析 country、subdivision、city 等字段；地理解析有精度限制。

## 专家评审

第一轮实习生调研 4 个方向：路由/页面结构、后端与部署边界、UI 与图表依赖、通用埋点模型。

两位专家独立审核候选报告，评分均为 88/100，结论均为“通过但需修正”。主要修正点：

- 补充 `repo.json`、`docs/localhost-ai-gateway-debug.md`、`scripts/wiki-admin-plugin.ts`、`index.html` 作为证据。
- 明确 `/api/` 反代是未来扩展示例，不是当前生产 API。
- 明确 dashboard 路由需要访问控制。
- 限定 UV 口径误差，不把 IP UV 或匿名 ID UV 说成真实用户。
- 区分外部工具能力事实和选型判断。

这些修正已纳入本文。

## 不确定项

- 未检查真实服务器 Nginx 配置、生产 access log 格式、AI Gateway 子仓代码和云平台日志服务。
- 中国省级 IP 精度取决于 IP 库或云厂商解析质量，只能说“按 IP 库解析到省级维度”，不能宣称精确到真实所在地。
- 如果后续决定直接实现，需要先确认 dashboard 权限方案和 analytics 服务放置位置。
