import { useCallback, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion } from "framer-motion";
import { RotateCcw, Download, Upload, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useClueStore } from "@/stores/use-clue-store";
import { downloadJson, importFromJson } from "@/utils/json-io";
import { getAutoLayout } from "@/utils/auto-layout";
import { ClueNodeType } from "./ClueNode";
import { AnimatedEdge } from "./AnimatedEdge";
import { DirectDiscoverDialog } from "./DirectDiscoverDialog";

const nodeTypes = { clueNode: ClueNodeType };
const edgeTypes = { animated: AnimatedEdge };

function ModuleToolInner() {
  const { clueData, triggerEdge, directDiscoverNode, cancelDirectDiscovery, resetAll, setClueData } =
    useClueStore();
  const { fitView } = useReactFlow();

  // 计算哪些节点有出边（有下游子节点）
  const nodesWithChildren = new Set(clueData.edges.map((e) => e.source));
  const initialNodes: Node[] = clueData.nodes.map((n) => ({
    ...n,
    type: n.type || "clueNode",
    data: { ...n.data, hasChildren: nodesWithChildren.has(n.id) },
  }));
  const initialEdges: Edge[] = clueData.edges.map((e) => ({
    ...e,
    type: "animated",
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 16,
      height: 16,
      color: "var(--primary)",
    },
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // 直接发现弹窗
  const [discoverDialog, setDiscoverDialog] = useState<{
    open: boolean;
    nodeId: string;
    nodeLabel: string;
  }>({ open: false, nodeId: "", nodeLabel: "" });

  // 边点击：触发关系发现
  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      triggerEdge(edge.id);

      // 同步本地状态
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);

      const isNowTriggered = !edge.data?.triggered;

      setEdges((eds) =>
        eds.map((e) =>
          e.id === edge.id
            ? { ...e, data: { ...e.data, triggered: isNowTriggered } }
            : e
        )
      );

      if (isNowTriggered) {
        // 标记两端节点为已发现，并自动取消隐藏
        setNodes((nds) =>
          nds.map((n) =>
            n.id === edge.source || n.id === edge.target
              ? { ...n, hidden: false, data: { ...n.data, discovered: true } }
              : n
          )
        );
        // 同时取消隐藏相关的边
        setEdges((eds) =>
          eds.map((e) =>
            e.source === edge.source || e.target === edge.source ||
            e.source === edge.target || e.target === edge.target
              ? { ...e, hidden: false }
              : e
          )
        );
        toast(
          `「${edge.data?.action || "关联"}」已触发 → 发现「${sourceNode?.data?.label}」和「${targetNode?.data?.label}」`,
          { duration: 2500 }
        );
      } else {
        // 取消触发：检查节点是否还有其他已触发的边
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id !== edge.source && n.id !== edge.target) return n;
            const hasOtherTriggered = edges.some(
              (otherE) =>
                otherE.id !== edge.id &&
                otherE.data?.triggered &&
                (otherE.source === n.id || otherE.target === n.id)
            );
            if (!hasOtherTriggered && !n.data?.directDiscoveryNote) {
              return { ...n, data: { ...n.data, discovered: false } };
            }
            return n;
          })
        );
        toast(`已取消「${edge.data?.action || "关联"}」`, { duration: 1500 });
      }
    },
    [triggerEdge, setEdges, setNodes, nodes, edges]
  );

  // 节点点击：三种情况
  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    if (node.data?.discovered) {
      if (node.data?.directDiscoveryNote) {
        // 已发现 + 有特殊发现说明 → 取消特殊发现
        cancelDirectDiscovery(node.id);
        const hasTriggeredEdge = edges.some(
          (e) => e.data?.triggered && (e.source === node.id || e.target === node.id)
        );
        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? { ...n, data: { ...n.data, discovered: hasTriggeredEdge, directDiscoveryNote: undefined } }
              : n
          )
        );
        toast.success(`已取消「${node.data?.label}」的特殊发现`);
      } else {
        // 已发现 + 无特殊发现说明（通过边触发） → 提示
        toast(`「${node.data?.label}」已通过关系触发发现`, { duration: 1500 });
      }
      return;
    }
    // 未发现 → 打开特殊发现弹窗
    setDiscoverDialog({
      open: true,
      nodeId: node.id,
      nodeLabel: (node.data?.label as string) || "",
    });
  }, [cancelDirectDiscovery, edges, setNodes]);

  const handleDirectDiscover = useCallback(
    (note: string) => {
      directDiscoverNode(discoverDialog.nodeId, note);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === discoverDialog.nodeId
            ? { ...n, data: { ...n.data, discovered: true, directDiscoveryNote: note } }
            : n
        )
      );
      toast.success(`直接发现「${discoverDialog.nodeLabel}」: ${note}`);
      setDiscoverDialog({ open: false, nodeId: "", nodeLabel: "" });
    },
    [discoverDialog, directDiscoverNode, setNodes]
  );

  // 统计
  const discoveredCount = nodes.filter((n) => n.data?.discovered).length;
  const triggeredCount = edges.filter((e) => e.data?.triggered).length;

  // 一键排版
  const handleAutoLayout = useCallback(() => {
    const layoutedNodes = getAutoLayout(nodes, edges, "TB");
    setNodes(layoutedNodes);
    setTimeout(() => fitView({ duration: 600 }), 50);
    toast.success("已完成自动排版");
  }, [nodes, edges, setNodes, fitView]);

  // 导出
  const handleExport = () => {
    downloadJson(
      {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        modules: [
          {
            ...clueData,
            nodes: nodes.map((n) => ({
              id: n.id,
              type: n.type || "clueNode",
              position: n.position,
              data: n.data as { label: string; description: string; discovered: boolean; category: string; [key: string]: unknown },
            })),
            edges: clueData.edges,
          },
        ],
      },
      `trpg-clues-${Date.now()}.json`
    );
    toast.success("线索数据导出成功");
  };

  // 导入
  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const data = await importFromJson(file);
        if (data.modules?.[0]) {
          const mod = data.modules[0];
          setClueData(mod);
          setNodes(mod.nodes.map((n) => ({ ...n, type: n.type || "clueNode" })));
          setEdges(mod.edges.map((edge) => ({
            ...edge,
            type: "animated",
            markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "var(--primary)" },
          })));
          toast.success("线索数据导入成功");
        } else {
          toast.error("未找到线索数据");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "导入失败");
      }
    };
    input.click();
  };

  // 重置
  const handleReset = () => {
    resetAll();
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, discovered: false, directDiscoveryNote: undefined },
      }))
    );
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        data: { ...e.data, triggered: false },
      }))
    );
    toast.success("已重置所有状态");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-4"
    >
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-bold">{clueData.moduleName}</h2>
        <Badge variant="secondary">
          线索 {discoveredCount}/{nodes.length}
        </Badge>
        <Badge variant="outline">
          关系 {triggeredCount}/{edges.length}
        </Badge>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={handleAutoLayout}>
          <LayoutGrid className="mr-1 h-4 w-4" /> 一键排版
        </Button>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="mr-1 h-4 w-4" /> 重置
        </Button>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-1 h-4 w-4" /> 导出
        </Button>
        <Button variant="outline" size="sm" onClick={handleImport}>
          <Upload className="mr-1 h-4 w-4" /> 导入
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        点击<strong>关系标签</strong>（边上的文字）触发发现，自动标记两端线索。点击未发现的<strong>节点</strong>可直接发现（需说明原因）。
      </p>

      {/* DAG 图 */}
      <div className="h-[calc(100vh-240px)] min-h-[400px] overflow-hidden rounded-lg border bg-card dag-container">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onEdgeClick={handleEdgeClick}
          onNodeClick={handleNodeClick}
          fitView
          minZoom={0.3}
          maxZoom={2}
          panOnDrag={[0, 1, 2]}
          zoomOnPinch
          panOnScroll
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} />
          <Controls className="!bg-background !border-border !shadow-sm" />
          <MiniMap nodeStrokeWidth={2} className="!bg-background !border-border" />
        </ReactFlow>
      </div>

      {/* 直接发现弹窗 */}
      <DirectDiscoverDialog
        open={discoverDialog.open}
        onOpenChange={(open) =>
          setDiscoverDialog((prev) => ({ ...prev, open }))
        }
        nodeLabel={discoverDialog.nodeLabel}
        onConfirm={handleDirectDiscover}
      />
    </motion.div>
  );
}

export default function ModuleToolTab() {
  return (
    <ReactFlowProvider>
      <ModuleToolInner />
    </ReactFlowProvider>
  );
}
