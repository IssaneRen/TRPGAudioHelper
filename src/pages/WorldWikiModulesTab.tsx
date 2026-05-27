import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { WikiIndexPayload } from "@/types/wiki";

export default function WorldWikiModulesTab() {
  const { moduleId } = useParams<{ moduleId?: string }>();
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

  const module = useMemo(
    () => indexData?.modules.find((m) => m.id === moduleId) ?? null,
    [indexData, moduleId]
  );
  const moduleEntries = useMemo(
    () => (indexData?.entries || []).filter((e) => (moduleId ? e.moduleIds?.includes(moduleId) : false)),
    [indexData, moduleId]
  );

  return (
    <div className="space-y-4">
      <Link to="/tools/world-wiki" className="inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" />
        返回Wiki
      </Link>

      <h2 className="text-2xl font-bold">{moduleId ? `${module?.displayName || "未知模组"} - 模组详情` : "模组总览"}</h2>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          模组列表加载失败：{error}
        </div>
      ) : !indexData ? (
        <p className="text-sm text-muted-foreground">暂无模组数据。</p>
      ) : !moduleId ? (
        indexData.modules.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无可展示的模组。</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {indexData.modules.map((item) => (
              <Link key={item.id} to={`/tools/world-wiki/modules/${item.id}`}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{item.displayName}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    唯一键：{item.id}
                    {item.aliases?.length ? ` · 别名：${item.aliases.join(" / ")}` : ""}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )
      ) : !module ? (
        <p className="text-sm text-muted-foreground">该模组不存在或已删除。</p>
      ) : moduleEntries.length === 0 ? (
        <p className="text-sm text-muted-foreground">当前模组还没有关联词条。</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {moduleEntries.map((entry) => (
            <Link key={entry.id} to={`/tools/world-wiki/${entry.id}`}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{entry.displayName}</CardTitle>
                </CardHeader>
                <CardContent>{entry.summary}</CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
