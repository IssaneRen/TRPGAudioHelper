import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { TaskStatus, TaskPriority } from "@/types";

const statusConfig: Record<TaskStatus, { bg: string; border: string; text: string; label: string }> = {
  pending: { bg: "bg-muted/60", border: "border-border/50", text: "text-muted-foreground", label: "待办" },
  in_progress: { bg: "bg-emerald-500/10 dark:bg-emerald-400/10", border: "border-emerald-500/40", text: "text-emerald-700 dark:text-emerald-400", label: "进行中" },
  completed: { bg: "bg-amber-500/10 dark:bg-amber-400/10", border: "border-amber-500/40", text: "text-amber-700 dark:text-amber-400", label: "已完成" },
  failed: { bg: "bg-red-500/10 dark:bg-red-400/10", border: "border-red-500/40", text: "text-red-700 dark:text-red-400", label: "失败" },
};

const priorityDot: Record<TaskPriority, string> = {
  low: "bg-slate-400",
  medium: "bg-blue-500",
  high: "bg-red-500",
};

function TaskNodeComponent({ data }: NodeProps) {
  const status = (data.status as TaskStatus) || "pending";
  const priority = (data.priority as TaskPriority) || "medium";
  const config = statusConfig[status];

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 min-w-[120px] max-w-[180px] shadow-sm transition-all",
        config.bg,
        config.border,
      )}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-primary/50" />

      <div className="flex items-center gap-1.5 mb-1">
        <span className={cn("w-2 h-2 rounded-full shrink-0", priorityDot[priority])} />
        <span className="text-xs font-semibold truncate">{data.label as string}</span>
      </div>

      {data.description ? (
        <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2 mb-1">
          {data.description as string}
        </p>
      ) : null}

      <div className="flex items-center justify-between">
        <span className={cn("text-[10px] font-medium", config.text)}>
          {config.label}
        </span>
        {data.assignee ? (
          <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">
            {data.assignee as string}
          </span>
        ) : null}
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-primary/50" />
    </div>
  );
}

export const TaskNodeType = memo(TaskNodeComponent);
