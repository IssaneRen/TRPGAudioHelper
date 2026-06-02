import { useState } from "react";
import { Link } from "react-router";
import { ChevronDown, User } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { CocAttributes, CocSkillChange, NormalizedCocSheet } from "@/types/wiki";
import { ATTRIBUTE_LABELS, DERIVED_LABELS, normalizeCocSheet } from "@/utils/coc-sheet";
import type { CocSheetData } from "@/types/wiki";

const WIKI_HOME_ROUTE = "/tools/world-wiki";

function stopBubble(event: React.SyntheticEvent) {
  event.stopPropagation();
}

function StatChip({
  label,
  value,
  subValue,
  valueClassName,
  className,
}: {
  label: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/50 bg-background/60 px-2 py-1.5 text-center",
        className
      )}
    >
      <div className="text-[10px] tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("text-sm font-semibold", valueClassName)}>{value}</div>
      {subValue ? <div className="mt-0.5 text-[10px] text-muted-foreground">{subValue}</div> : null}
    </div>
  );
}

function CocPortrait({
  avatar,
  displayName,
  compact,
}: {
  avatar?: string;
  displayName?: string;
  compact?: boolean;
}) {
  const frameClass = compact
    ? "h-[88px] w-[66px]"
    : "h-[120px] w-[90px]";

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-md border-2 border-border/70 bg-muted/40 shadow-inner",
        frameClass
      )}
    >
      {avatar ? (
        <img
          src={avatar}
          alt={displayName ? `${displayName} 头像` : "人物头像"}
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-b from-muted/30 to-muted/60 text-muted-foreground">
          <User className={compact ? "h-8 w-8 opacity-50" : "h-10 w-10 opacity-50"} strokeWidth={1.25} />
          <span className="text-[9px] tracking-wider opacity-60">暂无照片</span>
        </div>
      )}
    </div>
  );
}

function GrowthBadge({
  growth,
  changes,
  showTooltip,
}: {
  growth: number;
  changes: CocSkillChange[];
  showTooltip: boolean;
}) {
  const label = growth > 0 ? `+${growth}` : "+0";
  const canExplain = showTooltip && (changes.length > 0 || growth !== 0);

  const badge = (
    <span
      className={cn(
        "text-[11px] font-medium leading-none text-emerald-600 dark:text-emerald-400",
        canExplain && "cursor-help underline decoration-dotted underline-offset-2"
      )}
      title={!canExplain ? undefined : "悬停查看成长记录"}
    >
      {label}
    </span>
  );

  if (!canExplain) {
    return badge;
  }

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex rounded px-0.5 text-left transition-colors hover:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onClick={stopBubble}
          onPointerDown={stopBubble}
        >
          {badge}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="z-[80] max-w-xs space-y-1.5 text-left">
        <p className="font-medium text-foreground">成长记录</p>
        {changes.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            合计 {label}，暂无分项说明（可在 Wiki 管理台为技能补充 changes）
          </p>
        ) : (
          <ul className="space-y-1.5">
            {changes.map((change, index) => (
              <li key={`${change.reason}-${index}`} className="text-xs leading-5">
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {change.delta > 0 ? `+${change.delta}` : change.delta}
                </span>
                <span className="text-muted-foreground"> · </span>
                <span>{change.reason}</span>
                {change.at ? (
                  <span className="text-muted-foreground">（{change.at}）</span>
                ) : null}
                {change.reportId ? (
                  <>
                    <span className="text-muted-foreground"> · </span>
                    <Link
                      to={`${WIKI_HOME_ROUTE}/${change.reportId}`}
                      className="text-primary hover:underline"
                      onClick={stopBubble}
                    >
                      查看战报
                    </Link>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

function SkillCard({
  name,
  base,
  growth,
  final,
  changes,
  showGrowthTooltip,
  compact,
}: {
  name: string;
  base: number;
  growth: number;
  final: number;
  changes: CocSkillChange[];
  showGrowthTooltip: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[52px] items-stretch overflow-hidden rounded-md border border-border/50 bg-background/60",
        compact ? "text-[11px]" : "text-xs"
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col justify-center px-2 py-1.5">
        <span className="truncate font-medium text-foreground/90">{name}</span>
        <span className={cn("font-semibold text-destructive", compact ? "text-sm" : "text-base")}>
          {final}
        </span>
      </div>
      <div className="w-px shrink-0 bg-border/60" aria-hidden />
      <div className="flex w-[38px] shrink-0 flex-col items-center justify-center gap-1 py-1.5">
        <span className="text-[11px] leading-none text-muted-foreground">{base}</span>
        <GrowthBadge growth={growth} changes={changes} showTooltip={showGrowthTooltip} />
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  defaultOpen,
  variant,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  variant: "compact" | "full";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        type="button"
        className={cn(
          "flex w-full cursor-pointer items-center justify-between rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          variant === "compact" ? "py-1.5 text-xs" : "py-2"
        )}
        onClick={stopBubble}
        onPointerDown={stopBubble}
      >
        <span>{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent
        className="pt-2"
        onClick={stopBubble}
        onPointerDown={stopBubble}
      >
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function AttributesBody({
  attributes,
  avatar,
  displayName,
  compact,
}: {
  attributes: CocAttributes;
  avatar?: string;
  displayName?: string;
  compact?: boolean;
}) {
  const coreAttrs = Object.entries(ATTRIBUTE_LABELS) as [keyof typeof ATTRIBUTE_LABELS, string][];
  const damageBonus = attributes.damageBonus ?? attributes.build ?? "0";
  const physique = attributes.physique ?? 0;
  const dodge = attributes.dodge ?? Math.floor(attributes.dex / 2);

  return (
    <div className={cn("flex gap-3 px-1", compact ? "gap-2" : "gap-4")}>
      <CocPortrait avatar={avatar} displayName={displayName} compact={compact} />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {DERIVED_LABELS.map(({ key, label }) => (
            <StatChip
              key={key}
              label={label}
              valueClassName="text-destructive"
              value={
                <>
                  {attributes[key]}
                  <span className="text-xs font-normal text-muted-foreground">
                    /{attributes[key === "hp" ? "maxHp" : key === "mp" ? "maxMp" : "maxSan"]}
                  </span>
                </>
              }
            />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {coreAttrs.map(([key, label]) => (
            <StatChip
              key={key}
              label={label}
              value={attributes[key]}
              valueClassName="font-medium text-foreground"
              className="rounded-md border-border/40 bg-background/40 py-1"
            />
          ))}
        </div>
        <div className="mx-auto grid max-w-sm grid-cols-3 gap-2">
          <StatChip label="体格" value={physique > 0 ? `+${physique}` : physique} />
          <StatChip label="闪避" value={dodge} />
          <StatChip label="伤害加值" value={damageBonus} valueClassName="text-sm" />
        </div>
      </div>
    </div>
  );
}

export function CocSheetPanel({
  cocData,
  variant = "full",
  showGrowthTooltip = true,
  displayName,
  className,
}: {
  cocData?: CocSheetData | null;
  variant?: "compact" | "full";
  showGrowthTooltip?: boolean;
  displayName?: string;
  className?: string;
}) {
  const sheet = normalizeCocSheet(cocData);
  if (!sheet) return null;

  const { attributes, skills, avatar } = sheet;
  const compact = variant === "compact";

  return (
    <TooltipProvider delayDuration={150} skipDelayDuration={0}>
      <div
        className={cn(
          "space-y-2 rounded-xl border border-primary/20 bg-card/50",
          compact ? "p-2" : "p-4",
          className
        )}
        onClick={stopBubble}
        onPointerDown={stopBubble}
      >
        <CollapsibleSection title="属性" variant={variant}>
          <AttributesBody
            attributes={attributes}
            avatar={avatar}
            displayName={displayName}
            compact={compact}
          />
        </CollapsibleSection>

        <CollapsibleSection title="技能" variant={variant}>
          <div
            className={cn(
              "max-h-56 overflow-y-auto px-1",
              compact ? "grid grid-cols-1 gap-1.5 sm:grid-cols-2" : "grid grid-cols-2 gap-2 md:grid-cols-3"
            )}
          >
            {skills.length === 0 ? (
              <p className="col-span-full text-xs text-muted-foreground">暂无技能数据</p>
            ) : (
              skills.map((skill) => (
                <SkillCard
                  key={skill.name}
                  name={skill.name}
                  base={skill.base}
                  growth={skill.growth}
                  final={skill.final}
                  changes={skill.changes}
                  showGrowthTooltip={showGrowthTooltip}
                  compact={compact}
                />
              ))
            )}
          </div>
          {showGrowthTooltip && skills.some((s) => s.growth > 0) ? (
            <p className="mt-2 px-1 text-[10px] text-muted-foreground">
              提示：将鼠标悬停在绿色成长数字（如 +6）上可查看变更记录
            </p>
          ) : null}
        </CollapsibleSection>
      </div>
    </TooltipProvider>
  );
}

export function CocSheetPanelFromNormalized({
  sheet,
  variant = "full",
  showGrowthTooltip = true,
  displayName,
  className,
}: {
  sheet: NormalizedCocSheet;
  variant?: "compact" | "full";
  showGrowthTooltip?: boolean;
  displayName?: string;
  className?: string;
}) {
  return (
    <CocSheetPanel
      cocData={{
        avatar: sheet.avatar,
        attributes: sheet.attributes,
        skills: Object.fromEntries(
          sheet.skills.map((skill) => [
            skill.name,
            {
              base: skill.base,
              growth: skill.growth,
              changes: skill.changes,
            },
          ])
        ),
      }}
      variant={variant}
      showGrowthTooltip={showGrowthTooltip}
      displayName={displayName}
      className={className}
    />
  );
}
