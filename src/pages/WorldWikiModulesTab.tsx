import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { WikiIndexPayload } from "@/types/wiki";

function ModuleTag({ tag, variant = "secondary" }: { tag: string; variant?: "default" | "outline" | "secondary" }) {
  return (
    <Badge
      variant={variant}
      title={tag}
      className="inline-block max-w-48 truncate align-bottom"
    >
      {tag}
    </Badge>
  );
}

export default function WorldWikiModulesTab() {
  const [indexData, setIndexData] = useState<WikiIndexPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

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

  const tags = useMemo(
    () => Array.from(new Set((indexData?.modules || []).flatMap((module) => module.tags || []))).sort(),
    [indexData]
  );
  const modules = useMemo(
    () => (indexData?.modules || []).filter((module) => !selectedTag || module.tags?.includes(selectedTag)),
    [indexData, selectedTag]
  );

  return (
    <div className="space-y-4">
      <Link to="/tools/world-wiki" className="inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" />
        返回Wiki
      </Link>

      <div>
        <h2 className="text-2xl font-bold">模组总览</h2>
        <p className="mt-1 text-sm text-muted-foreground">按背景标签浏览已有初始模组条目。</p>
      </div>

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
      ) : indexData.modules.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无可展示的模组。</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setSelectedTag(null)}>
                <Badge variant={selectedTag === null ? "default" : "outline"}>全部</Badge>
              </button>
              {tags.map((tag) => (
                <button key={tag} onClick={() => setSelectedTag(tag)}>
                  <ModuleTag tag={tag} variant={selectedTag === tag ? "default" : "outline"} />
                </button>
              ))}
            </div>
            {modules.length === 0 ? (
              <p className="text-sm text-muted-foreground">该标签下暂无模组。</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {modules.map((item) => (
                  <Link key={item.id} to={`/tools/world-wiki/${item.id}`}>
                    <Card className="h-full">
                      <CardHeader>
                        <CardTitle className="text-base">{item.displayName}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm text-muted-foreground">
                        {item.summary && <p>{item.summary}</p>}
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {item.tags.map((tag) => (
                              <ModuleTag key={tag} tag={tag} />
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
    </div>
  );
}
