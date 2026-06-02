import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ModuleDescription } from "@/features/modules/ModuleDescription";
import type { WikiIndexPayload, WikiModule } from "@/types/wiki";

export default function WorldWikiModuleDetailTab() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [indexData, setIndexData] = useState<WikiIndexPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/wiki/index.json", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`加载失败：${r.status}`);
        return r.json();
      })
      .then((data: WikiIndexPayload) => {
        if (!cancelled) setIndexData(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const module = useMemo<WikiModule | null>(() => {
    if (!moduleId) return null;
    return (indexData?.modules || []).find((item) => item.id === moduleId) ?? null;
  }, [indexData, moduleId]);

  const campaignChildModules = useMemo<WikiModule[]>(() => {
    if (!module?.campaign || !module.id.endsWith(".overview")) return [];
    return (indexData?.modules || []).filter(
      (item) => item.campaign === module.campaign && item.id !== module.id
    );
  }, [indexData, module]);

  return (
    <div className="space-y-4">
      <Link to="/tools/world-wiki/modules" className="inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" />
        返回模组列表
      </Link>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          模组详情加载失败：{error}
        </div>
      ) : !module ? (
        <div className="rounded-xl border border-border/60 bg-background/65 px-4 py-10 text-center text-sm text-muted-foreground">
          找不到该模组：{moduleId}
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <article className="rounded-[28px] border border-border/70 bg-card/80 p-6 shadow-sm md:p-8">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {module.ruleSystem && (
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                    {module.ruleSystem}
                  </Badge>
                )}
                {module.campaign && <Badge variant="outline">战役：{module.campaign}</Badge>}
                {!module.campaign && module.collection && <Badge variant="outline">模组集：{module.collection}</Badge>}
                <Badge variant="outline">唯一键：{module.id}</Badge>
              </div>
              <h1 className="text-3xl font-heading font-semibold leading-tight">{module.displayName}</h1>
              {(module.summary || module.description) && (
                <p className="max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
                  {module.summary || "（暂无列表简介）"}
                </p>
              )}
            </div>

            {module.description && (
              <div className="mt-8 space-y-4">
                <h2 className="text-lg font-heading font-semibold">模组导读</h2>
                <div className="rounded-2xl border border-border/60 bg-background/65 p-4 md:p-5">
                  <ModuleDescription description={module.description} />
                </div>
              </div>
            )}
            {campaignChildModules.length > 0 && (
              <div className="mt-8 space-y-4">
                <h2 className="text-lg font-heading font-semibold">子模组</h2>
                <div className="grid gap-3">
                  {campaignChildModules.map((childModule) => (
                    <Link
                      key={childModule.id}
                      to={`/tools/world-wiki/modules/${childModule.id}`}
                      className="rounded-2xl border border-border/60 bg-background/65 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-heading text-base font-semibold leading-7">
                            {childModule.displayName}
                          </h3>
                          {(childModule.summary || childModule.description) && (
                            <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                              {childModule.summary || childModule.description}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-1.5">
                          {childModule.duration && (
                            <Badge variant="outline" className="text-[11px]">
                              {childModule.duration}
                            </Badge>
                          )}
                          {childModule.playerCount && (
                            <Badge variant="outline" className="text-[11px]">
                              {childModule.playerCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </article>

          <aside className="space-y-4">
            <Card className="gap-4 border-border/70 bg-card/80 py-5">
              <CardHeader className="gap-2">
                <CardTitle className="text-base">推荐信息</CardTitle>
                <CardDescription>快速判断是否适合你的车队</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {module.playerCount && (
                  <div className="rounded-xl border border-border/50 bg-background/65 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">推荐人数</p>
                    <p className="mt-1 leading-6">{module.playerCount}</p>
                  </div>
                )}
                {module.duration && (
                  <div className="rounded-xl border border-border/50 bg-background/65 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">推荐时长</p>
                    <p className="mt-1 leading-6">{module.duration}</p>
                  </div>
                )}
                {module.tags && module.tags.length > 0 && (
                  <div className="rounded-xl border border-border/50 bg-background/65 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">标签</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {module.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[11px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}

