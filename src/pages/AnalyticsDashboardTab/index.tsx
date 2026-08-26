import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Activity, BarChart3, Eye, MousePointerClick, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAiSession } from "@/features/ai/use-ai-session";
import { fetchAnalyticsSummary, type AnalyticsSummary } from "@/features/analytics/analytics-client";

interface DonutSegment {
  label: string;
  value: number;
  className: string;
  swatchClassName: string;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Eye;
}) {
  return (
    <Card className="rounded-lg">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 font-heading text-3xl font-semibold tracking-normal">{formatNumber(value)}</p>
        </div>
        <div className="rounded-md border bg-primary/10 p-2 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyRow({ label }: { label: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{label}</p>;
}

function DonutChart({ segments }: { segments: DonutSegment[] }) {
  const total = segments.reduce((sum, item) => sum + item.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  if (total === 0) {
    return (
      <svg viewBox="0 0 120 120" className="h-32 w-32" aria-label="暂无数据">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="14" className="text-muted/60" />
        <text x="60" y="64" textAnchor="middle" className="fill-muted-foreground text-[11px]">
          暂无
        </text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90" aria-label="统计圆环图">
      <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="14" className="text-muted/50" />
      {segments
        .filter((item) => item.value > 0)
        .map((item) => {
          const length = (item.value / total) * circumference;
          const dashOffset = -offset;
          offset += length;
          return (
            <circle
              key={item.label}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="14"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              className={item.className}
            />
          );
        })}
    </svg>
  );
}

function DonutPanel({
  title,
  description,
  segments,
}: {
  title: string;
  description: string;
  segments: DonutSegment[];
}) {
  const total = segments.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-5 sm:flex-row">
        <div className="relative flex shrink-0 items-center justify-center">
          <DonutChart segments={segments} />
          <div className="pointer-events-none absolute text-center">
            <div className="font-heading text-2xl font-semibold tracking-normal">{formatNumber(total)}</div>
            <div className="text-[10px] text-muted-foreground">总量</div>
          </div>
        </div>
        <div className="grid w-full gap-2">
          {segments.map((item) => {
            const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
            return (
              <div key={item.label} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.swatchClassName}`} />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatNumber(item.value)} · {percent}%
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsDashboardTab() {
  const aiSession = useAiSession();
  const [tokenInput, setTokenInput] = useState("");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  const canView = Boolean(aiSession.token && aiSession.session?.isKeeper);

  const loadSummary = useMemo(
    () => async () => {
      if (!aiSession.token || !aiSession.session?.isKeeper) return;
      setLoadingSummary(true);
      setSummaryError("");
      try {
        setSummary(await fetchAnalyticsSummary(aiSession.token));
      } catch (error) {
        const message = error instanceof Error ? error.message : "统计数据加载失败";
        setSummaryError(message);
      } finally {
        setLoadingSummary(false);
      }
    },
    [aiSession.session?.isKeeper, aiSession.token]
  );

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const session = await aiSession.login(tokenInput);
      toast.success(`已登录为 ${session.displayName}`);
      setTokenInput("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "登录失败");
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase text-primary">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-normal md:text-4xl">
            数据仪表盘
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            展示自建 analytics 采集到的页面曝光、点击事件、访客和 PL 登录维度。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {aiSession.session ? (
            <Badge variant={aiSession.session.isKeeper ? "default" : "outline"} className="rounded-md">
              {aiSession.session.isKeeper ? "KP" : "PL"}：{aiSession.session.displayName}
            </Badge>
          ) : null}
          <Button type="button" variant="outline" onClick={() => void loadSummary()} disabled={!canView || loadingSummary}>
            <RefreshCw className={`h-4 w-4 ${loadingSummary ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>
      </section>

      {!aiSession.session ? (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              需要 KP token
            </CardTitle>
            <CardDescription>仪表盘只向 KP 开放。登录后会读取聚合数据，不展示原始 IP。</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleLogin}>
              <Input
                type="password"
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                placeholder="输入 KP token"
                aria-label="KP token"
              />
              <Button type="submit" disabled={aiSession.loading}>
                登录
              </Button>
            </form>
            {aiSession.error ? <p className="mt-3 text-sm text-destructive">{aiSession.error}</p> : null}
          </CardContent>
        </Card>
      ) : null}

      {aiSession.session && !aiSession.session.isKeeper ? (
        <Card className="rounded-lg border-destructive/30">
          <CardHeader>
            <CardTitle>当前 token 无权查看统计</CardTitle>
            <CardDescription>请切换到 KP token。PL 登录仍会被记录为访问维度。</CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="outline" onClick={aiSession.logout}>
              退出当前 token
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {loadingSummary ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
      ) : summary ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="事件总数" value={summary.totals.events} icon={Activity} />
            <MetricCard label="页面 PV" value={summary.totals.pageViews} icon={Eye} />
            <MetricCard label="唯一访客" value={summary.totals.uniqueVisitors} icon={Users} />
            <MetricCard label="点击事件" value={summary.totals.clicks} icon={MousePointerClick} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <DonutPanel
              title="事件构成"
              description="曝光、点击和其他事件的比例"
              segments={[
                { label: "页面曝光", value: summary.totals.pageViews, className: "text-primary", swatchClassName: "bg-primary" },
                { label: "点击事件", value: summary.totals.clicks, className: "text-accent", swatchClassName: "bg-accent" },
                {
                  label: "其他事件",
                  value: Math.max(0, summary.totals.events - summary.totals.pageViews - summary.totals.clicks),
                  className: "text-muted-foreground",
                  swatchClassName: "bg-muted-foreground",
                },
              ]}
            />
            <DonutPanel
              title="身份构成"
              description="已登录 PL/KP 与匿名访问的事件比例"
              segments={[
                {
                  label: "已登录",
                  value: summary.players.reduce((sum, item) => sum + item.events, 0),
                  className: "text-primary",
                  swatchClassName: "bg-primary",
                },
                {
                  label: "匿名",
                  value: Math.max(0, summary.totals.events - summary.players.reduce((sum, item) => sum + item.events, 0)),
                  className: "text-muted-foreground",
                  swatchClassName: "bg-muted-foreground",
                },
              ]}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle>页面曝光</CardTitle>
                <CardDescription>按路由聚合 PV / UV</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary.topPages.length === 0 ? (
                  <EmptyRow label="暂无页面曝光" />
                ) : (
                  summary.topPages.map((item) => (
                    <div key={item.pagePath} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                      <span className="min-w-0 truncate text-sm">{item.pagePath}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">PV {item.pv} / UV {item.uv}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle>点击事件</CardTitle>
                <CardDescription>按事件名聚合 PV / UV</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary.topClicks.length === 0 ? (
                  <EmptyRow label="暂无点击事件" />
                ) : (
                  summary.topClicks.map((item) => (
                    <div key={item.eventName} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                      <span className="min-w-0 truncate text-sm">{item.eventName}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">PV {item.pv} / UV {item.uv}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle>PL 访问</CardTitle>
                <CardDescription>登录 token 解析出的昵称</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary.players.length === 0 ? (
                  <EmptyRow label="暂无登录 PL 事件" />
                ) : (
                  summary.players.map((item) => (
                    <div key={item.playerId} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                      <span className="min-w-0 truncate text-sm">{item.displayName}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{item.events} 次</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>最近事件</CardTitle>
              <CardDescription>仅展示聚合安全字段，不展示原始 IP。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {summary.recentEvents.length === 0 ? (
                <EmptyRow label="暂无事件" />
              ) : (
                summary.recentEvents.map((event, index) => (
                  <div key={`${event.eventTime}-${event.eventName}-${index}`} className="grid gap-2 rounded-md border px-3 py-2 text-sm sm:grid-cols-[8rem_1fr_8rem]">
                    <span className="text-muted-foreground">{formatTime(event.eventTime)}</span>
                    <span className="min-w-0 truncate">{event.eventName} · {event.pagePath || "/"}</span>
                    <span className="truncate text-muted-foreground">{event.playerDisplayName || "匿名"}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      ) : canView && summaryError ? (
        <Card className="rounded-lg border-destructive/30">
          <CardHeader>
            <CardTitle>统计数据加载失败</CardTitle>
            <CardDescription>{summaryError}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </div>
  );
}
