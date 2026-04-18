import {
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
  EdgeLabelRenderer,
} from "@xyflow/react";

export function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  data,
  markerEnd,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  });

  const action = (data?.action as string) || "";
  const triggered = !!(data?.triggered);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: triggered ? 3 : 2,
          stroke: triggered ? "var(--muted-foreground)" : "var(--primary)",
          strokeDasharray: triggered ? "none" : "6 3",
          animation: triggered ? "none" : "dashFlow 1.5s linear infinite",
          opacity: triggered ? 0.4 : 1,
          cursor: "pointer",
        }}
      />
      {/* 可点击的边标签 */}
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-auto absolute cursor-pointer"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
          data-edge-id={id}
        >
          <div
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium shadow-sm transition-all duration-200 hover:scale-110 ${
              triggered
                ? "border-muted bg-muted/50 text-muted-foreground line-through opacity-60"
                : "border-primary/30 bg-background/95 text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary"
            }`}
          >
            {action || "关联"}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
