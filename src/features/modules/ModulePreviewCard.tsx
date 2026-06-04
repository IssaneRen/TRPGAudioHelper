import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WikiModule } from "@/types/wiki";

export function ModulePreviewCard({ module }: { module: WikiModule }) {
  return (
    <Card className="eldritch-card mobile-safe-width h-full border-border/70 bg-card/80 py-5 transition-transform hover:-translate-y-1">
      <CardHeader className="gap-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base leading-snug" title={module.displayName}>
              {module.displayName}
            </CardTitle>
          </div>
          {module.ruleSystem && (
            <Badge variant="outline" title={module.ruleSystem} className="max-w-[7rem] truncate border-primary/30 bg-primary/10 text-primary sm:max-w-36">
              {module.ruleSystem}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        {(module.summary || module.description) && (
          <p className="line-clamp-3 break-words leading-6">{module.summary || module.description}</p>
        )}
        <div className="flex min-w-0 flex-wrap gap-1.5 text-xs text-muted-foreground">
          {module.playerCount && <span className="break-words">推荐人数：{module.playerCount}</span>}
          {module.duration && <span className="break-words">推荐时长：{module.duration}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

