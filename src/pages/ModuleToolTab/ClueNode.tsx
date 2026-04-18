import { memo, useCallback } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";

const categoryColors: Record<string, string> = {
  core: "border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-500/50",
  important: "border-purple-700/50 bg-purple-50 dark:bg-purple-950/40 dark:border-purple-500/40",
  optional: "border-amber-700/40 bg-amber-50/50 dark:bg-amber-950/30 dark:border-amber-600/30",
  default: "border-border bg-card",
};

interface ClueNodeProps {
  id: string;
  data: {
    label?: string;
    description?: string;
    discovered?: boolean;
    directDiscoveryNote?: string;
    category?: string;
    collapsed?: boolean;
    hasChildren?: boolean;
    [key: string]: unknown;
  };
}

/** BFS 收集下游未发现节点用于收起（防死循环，已发现节点作为屏障） */
function getDownstreamUndiscovered(
  startId: string,
  nodes: { id: string; data: Record<string, unknown> }[],
  edges: { source: string; target: string }[]
): Set<string> {
  const result = new Set<string>();
  const visited = new Set<string>();
  const queue = [startId];
  visited.add(startId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const outEdges = edges.filter((e) => e.source === current);
    for (const edge of outEdges) {
      if (visited.has(edge.target)) continue;
      visited.add(edge.target);
      const targetNode = nodes.find((n) => n.id === edge.target);
      if (targetNode && !targetNode.data?.discovered) {
        result.add(edge.target);
        queue.push(edge.target);
      }
    }
  }
  return result;
}

/** BFS 收集所有下游隐藏节点用于展开（不管 discovered 状态） */
function getDownstreamHidden(
  startId: string,
  nodes: { id: string; data: Record<string, unknown>; hidden?: boolean }[],
  edges: { source: string; target: string }[]
): Set<string> {
  const result = new Set<string>();
  const visited = new Set<string>();
  const queue = [startId];
  visited.add(startId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const outEdges = edges.filter((e) => e.source === current);
    for (const edge of outEdges) {
      if (visited.has(edge.target)) continue;
      visited.add(edge.target);
      const targetNode = nodes.find((n) => n.id === edge.target);
      if (targetNode && targetNode.hidden) {
        result.add(edge.target);
        queue.push(edge.target);
      }
    }
  }
  return result;
}

function ClueNodeComponent({ id, data }: ClueNodeProps) {
  const category = (data.category as string) || "default";
  const discovered = !!data.discovered;
  const label = (data.label as string) || "";
  const description = (data.description as string) || "";
  const note = data.directDiscoveryNote as string | undefined;
  const collapsed = !!data.collapsed;
  const hasChildren = !!data.hasChildren;
  const colorClass = categoryColors[category] || categoryColors.default;
  const { getNodes, getEdges, setNodes, setEdges } = useReactFlow();

  const handleCollapse = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const allNodes = getNodes();
      const allEdges = getEdges();
      const nowCollapsed = !collapsed;

      if (nowCollapsed) {
        // 收起：找到下游未发现节点并隐藏
        const toHide = getDownstreamUndiscovered(id, allNodes, allEdges);
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === id) return { ...n, data: { ...n.data, collapsed: true } };
            if (toHide.has(n.id)) return { ...n, hidden: true };
            return n;
          })
        );
        setEdges((eds) =>
          eds.map((edge) => {
            if (toHide.has(edge.source) || toHide.has(edge.target)) {
              return { ...edge, hidden: true };
            }
            return edge;
          })
        );
      } else {
        // 展开：显示所有被隐藏的下游节点（不管 discovered 状态）
        const toShow = getDownstreamHidden(id, allNodes, allEdges);
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === id) return { ...n, data: { ...n.data, collapsed: false } };
            if (toShow.has(n.id)) return { ...n, hidden: false };
            return n;
          })
        );
        setEdges((eds) =>
          eds.map((edge) => {
            if (toShow.has(edge.source) || toShow.has(edge.target)) {
              return { ...edge, hidden: false };
            }
            return edge;
          })
        );
      }
    },
    [id, collapsed, getNodes, getEdges, setNodes, setEdges]
  );

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: discovered ? 0.45 : 1,
      }}
      whileHover={{ scale: 1.06, boxShadow: discovered ? "none" : "0 0 16px oklch(0.55 0.12 160 / 30%)" }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={`rounded-lg border-2 px-4 py-3 shadow-sm transition-all duration-300 cursor-pointer ${colorClass} ${
        discovered ? "grayscale" : ""
      }`}
      style={{
        minWidth: 140,
        animation: !discovered && category === "core" ? "eldritch-glow 3s ease-in-out infinite" : undefined,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary !w-2 !h-2" />
      <Handle type="target" position={Position.Left} id="target-left" className="!bg-primary !w-2 !h-2" />

      <div className="text-center">
        <div className="text-sm font-semibold">{label}</div>
        {description && (
          <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {description}
          </div>
        )}
        {discovered && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1 text-xs font-medium text-muted-foreground"
          >
            {note ? `已发现: ${note}` : "已发现"}
          </motion.div>
        )}
      </div>

      {/* 收起/展开按钮 */}
      {hasChildren && (
        <button
          onClick={handleCollapse}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 rounded-full border bg-background p-0.5 shadow-sm hover:bg-accent transition-colors"
          title={collapsed ? "展开下游线索" : "收起下游线索"}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2 !h-2" />
      <Handle type="source" position={Position.Right} id="source-right" className="!bg-primary !w-2 !h-2" />
    </motion.div>
  );
}

export const ClueNodeType = memo(ClueNodeComponent);
