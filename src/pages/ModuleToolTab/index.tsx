import { useCallback, useState, useMemo } from "react";
import { generateUUID } from "@/utils/uuid";
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
  type Connection,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
  ConnectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  RotateCcw, Download, Upload, LayoutGrid,
  Pencil, Eye, FilePlus, ChevronUp, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useClueStore } from "@/stores/use-clue-store";
import { downloadJson, importFromJson } from "@/utils/json-io";
import { getAutoLayout } from "@/utils/auto-layout";
import { ClueNodeType } from "./ClueNode";
import { AnimatedEdge } from "./AnimatedEdge";
import { DirectDiscoverDialog } from "./DirectDiscoverDialog";
import { NodeEditDialog } from "./NodeEditDialog";
import { EdgeEditDialog } from "./EdgeEditDialog";
import { ImagePreviewDialog } from "./ImagePreviewDialog";
import { TaskFlowSection } from "./TaskFlowSection";

const nodeTypes = { clueNode: ClueNodeType };
const edgeTypes = { animated: AnimatedEdge };

function buildInitialNodes(clueData: ReturnType<typeof useClueStore>["clueData"]): Node[] {
  const nodesWithChildren = new Set(clueData.edges.map((e) => e.source));
  return clueData.nodes.map((n) => ({
    ...n,
    type: n.type || "clueNode",
    data: { ...n.data, hasChildren: nodesWithChildren.has(n.id) },
  }));
}

function buildInitialEdges(clueData: ReturnType<typeof useClueStore>["clueData"]): Edge[] {
  return clueData.edges.map((e) => ({
    ...e,
    type: "animated",
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 16,
      height: 16,
      color: "var(--primary)",
    },
  }));
}

function ModuleToolInner() {
  const store = useClueStore();
  const { clueData } = store;
  const { fitView, getNodes, getEdges } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState(buildInitialNodes(clueData));
  const [edges, setEdges, onEdgesChange] = useEdgesState(buildInitialEdges(clueData));

  // 模式：view（展示）/ edit（创建/编辑）
  const [mode, setMode] = useState<"view" | "edit">("view");
  const isEditMode = mode === "edit";

  // 各种对话框状态
  const [discoverDialog, setDiscoverDialog] = useState<{
    open: boolean; nodeId: string; nodeLabel: string;
  }>({ open: false, nodeId: "", nodeLabel: "" });

  const [nodeEditDialog, setNodeEditDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    sourceNodeId?: string;
    editNodeId?: string;
    initialData?: { label: string; description: string; category: string; imageData?: string };
  }>({ open: false, mode: "create" });

  const [edgeEditDialog, setEdgeEditDialog] = useState<{
    open: boolean; edgeId: string; initialAction: string;
  }>({ open: false, edgeId: "", initialAction: "" });

  const [imagePreview, setImagePreview] = useState<{
    open: boolean; imageUrl: string; nodeLabel: string;
  }>({ open: false, imageUrl: "", nodeLabel: "" });

  // ==== 展示模式逻辑 ====
  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      if (isEditMode) return;
      store.triggerEdge(edge.id);
      const currentNodes = getNodes();
      const currentEdges = getEdges();
      const sourceNode = currentNodes.find((n) => n.id === edge.source);
      const targetNode = currentNodes.find((n) => n.id === edge.target);
      const isNowTriggered = !edge.data?.triggered;

      setEdges((eds) =>
        eds.map((e) =>
          e.id === edge.id
            ? { ...e, data: { ...e.data, triggered: isNowTriggered } }
            : e
        )
      );

      if (isNowTriggered) {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === edge.source || n.id === edge.target
              ? { ...n, hidden: false, data: { ...n.data, discovered: true } }
              : n
          )
        );
        setEdges((eds) =>
          eds.map((e) =>
            e.source === edge.source || e.target === edge.source ||
            e.source === edge.target || e.target === edge.target
              ? { ...e, hidden: false } : e
          )
        );
        toast(
          `「${edge.data?.action || "关联"}」已触发 → 发现「${sourceNode?.data?.label}」和「${targetNode?.data?.label}」`,
          { duration: 2500 }
        );
      } else {
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id !== edge.source && n.id !== edge.target) return n;
            const hasOtherTriggered = currentEdges.some(
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
    [isEditMode, store, setEdges, setNodes, getNodes, getEdges]
  );

  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    if (isEditMode) return; // 编辑模式不处理展示逻辑

    // 检查是否有图片需要预览
    // 图片节点的放大预览在双击中处理

    if (node.data?.discovered) {
      if (node.data?.directDiscoveryNote) {
        store.cancelDirectDiscovery(node.id);
        const currentEdges = getEdges();
        const hasTriggeredEdge = currentEdges.some(
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
        toast(`「${node.data?.label}」已通过关系触发发现`, { duration: 1500 });
      }
      return;
    }
    setDiscoverDialog({
      open: true,
      nodeId: node.id,
      nodeLabel: (node.data?.label as string) || "",
    });
  }, [isEditMode, store, getEdges, setNodes]);

  const handleDirectDiscover = useCallback(
    (note: string) => {
      store.directDiscoverNode(discoverDialog.nodeId, note);
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
    [discoverDialog, store, setNodes]
  );

  // ==== 编辑模式逻辑 ====

  // 添加节点（从某个节点的"+"按钮触发）
  const handleAddNodeNear = useCallback((sourceNodeId: string) => {
    setNodeEditDialog({
      open: true,
      mode: "create",
      sourceNodeId,
    });
  }, []);

  // 双击节点编辑
  const handleNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (!isEditMode) {
      // 展示模式：双击打开图片预览（如果有图片）
      if (node.data?.imageData) {
        setImagePreview({
          open: true,
          imageUrl: node.data.imageData as string,
          nodeLabel: (node.data?.label as string) || "",
        });
      }
      return;
    }
    setNodeEditDialog({
      open: true,
      mode: "edit",
      editNodeId: node.id,
      initialData: {
        label: (node.data?.label as string) || "",
        description: (node.data?.description as string) || "",
        category: (node.data?.category as string) || "default",
        imageData: node.data?.imageData as string | undefined,
      },
    });
  }, [isEditMode]);

  // 双击边编辑
  const handleEdgeDoubleClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    if (!isEditMode) return;
    setEdgeEditDialog({
      open: true,
      edgeId: edge.id,
      initialAction: (edge.data?.action as string) || "",
    });
  }, [isEditMode]);

  // 节点编辑确认
  const handleNodeEditConfirm = useCallback(
    (data: { label: string; description: string; category: string; imageData?: string }) => {
      if (nodeEditDialog.mode === "create" && nodeEditDialog.sourceNodeId) {
        const sourceNode = nodes.find((n) => n.id === nodeEditDialog.sourceNodeId);
        if (!sourceNode) return;

        const newNodeId = generateUUID();
        const newNode: Node = {
          id: newNodeId,
          type: "clueNode",
          position: {
            x: sourceNode.position.x + 200,
            y: sourceNode.position.y + 150,
          },
          data: {
            ...data,
            discovered: false,
            hasChildren: false,
          },
        };

        const newEdge: Edge = {
          id: `e-${generateUUID()}`,
          source: nodeEditDialog.sourceNodeId,
          target: newNodeId,
          type: "animated",
          animated: true,
          data: { action: "新关系", triggered: false },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 16,
            height: 16,
            color: "var(--primary)",
          },
        };

        setNodes((nds) => {
          const updated = nds.map((n) =>
            n.id === nodeEditDialog.sourceNodeId
              ? { ...n, data: { ...n.data, hasChildren: true } }
              : n
          );
          return [...updated, newNode];
        });
        setEdges((eds) => [...eds, newEdge]);

        store.addNode({
          id: newNodeId,
          type: "clueNode",
          position: newNode.position,
          data: { ...data, discovered: false },
        });
        store.addEdge({
          id: newEdge.id,
          source: nodeEditDialog.sourceNodeId,
          target: newNodeId,
          animated: true,
          data: { action: "新关系", triggered: false },
        });

        toast.success(`已添加线索「${data.label}」`);
      } else if (nodeEditDialog.mode === "edit" && nodeEditDialog.editNodeId) {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === nodeEditDialog.editNodeId
              ? { ...n, data: { ...n.data, ...data } }
              : n
          )
        );
        store.updateNode(nodeEditDialog.editNodeId, data);
        toast.success(`已更新线索「${data.label}」`);
      }
      setNodeEditDialog({ open: false, mode: "create" });
    },
    [nodeEditDialog, nodes, setNodes, setEdges, store]
  );

  // 边编辑确认
  const handleEdgeEditConfirm = useCallback(
    (action: string) => {
      setEdges((eds) =>
        eds.map((e) =>
          e.id === edgeEditDialog.edgeId
            ? { ...e, data: { ...e.data, action } }
            : e
        )
      );
      store.updateEdge(edgeEditDialog.edgeId, { action });
      toast.success("关系已更新");
      setEdgeEditDialog({ open: false, edgeId: "", initialAction: "" });
    },
    [edgeEditDialog, setEdges, store]
  );

  // 拖拽连线（编辑模式）
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) return;

      const newEdgeId = `e-${generateUUID()}`;
      const newEdge: Edge = {
        id: newEdgeId,
        source: connection.source,
        target: connection.target,
        type: "animated",
        animated: true,
        data: { action: "新关系", triggered: false },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color: "var(--primary)",
        },
      };

      setEdges((eds) => [...eds, newEdge]);
      store.addEdge({
        id: newEdgeId,
        source: connection.source,
        target: connection.target,
        animated: true,
        data: { action: "新关系", triggered: false },
      });

      // 更新 source 节点的 hasChildren
      setNodes((nds) =>
        nds.map((n) =>
          n.id === connection.source
            ? { ...n, data: { ...n.data, hasChildren: true } }
            : n
        )
      );

      toast.success("已创建新连线，双击标签可编辑");
    },
    [setEdges, setNodes, store]
  );

  // 删除节点/边（编辑模式，按 Delete/Backspace）
  const handleNodesDelete = useCallback(
    (deleted: Node[]) => {
      if (!isEditMode) return;
      for (const node of deleted) {
        if (node.id === "start") {
          toast.error("不能删除「模组开始」节点");
          // 恢复节点
          setNodes((nds) => [...nds, node]);
          return;
        }
        store.deleteNode(node.id);
      }
      toast.success(`已删除 ${deleted.length} 个节点`);
    },
    [isEditMode, store, setNodes]
  );

  const handleEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      if (!isEditMode) return;
      for (const edge of deleted) {
        store.deleteEdge(edge.id);
      }
      toast.success(`已删除 ${deleted.length} 条关系`);
    },
    [isEditMode, store]
  );

  // ==== 通用工具栏操作 ====

  const discoveredCount = nodes.filter((n) => n.data?.discovered).length;
  const triggeredCount = edges.filter((e) => e.data?.triggered).length;

  const handleAutoLayout = useCallback(() => {
    const layoutedNodes = getAutoLayout(nodes, edges, "TB");
    setNodes(layoutedNodes);
    setTimeout(() => fitView({ duration: 600 }), 50);
    toast.success("已完成自动排版");
  }, [nodes, edges, setNodes, fitView]);

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
          store.setClueData(mod);
          setNodes(buildInitialNodes(mod));
          setEdges(buildInitialEdges(mod));
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

  const handleReset = () => {
    store.resetAll();
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

  const handleNewModule = () => {
    const name = prompt("请输入新模组名称：");
    if (!name?.trim()) return;
    const newData = store.createNewModule(name.trim());
    setNodes(buildInitialNodes(newData));
    setEdges(buildInitialEdges(newData));
    setMode("edit");
    toast.success(`已创建新模组「${name.trim()}」`);
  };

  const handleModeToggle = () => {
    setMode((prev) => (prev === "view" ? "edit" : "view"));
  };

  // 线索区域折叠状态
  const [clueExpanded, setClueExpanded] = useState(true);

  // 将 handleAddNodeNear 传递给节点（通过 data）
  const nodesWithEditCallbacks = useMemo(() =>
    isEditMode
      ? nodes.map((n) => ({
          ...n,
          data: {
            ...n.data,
            isEditMode: true,
            onAddNode: handleAddNodeNear,
          },
        }))
      : nodes.map((n) => ({
          ...n,
          data: {
            ...n.data,
            isEditMode: false,
          },
        })),
    [nodes, isEditMode, handleAddNodeNear]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-4"
    >
      {/* 线索区域标题栏（可折叠） */}
      <div
        className="flex flex-wrap items-center gap-2 cursor-pointer select-none"
        onClick={() => setClueExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          {clueExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          <h2 className="text-xl font-bold">{clueData.moduleName}</h2>
        </div>
        {!isEditMode && (
          <>
            <Badge variant="secondary">
              线索 {discoveredCount}/{nodes.length}
            </Badge>
            <Badge variant="outline">
              关系 {triggeredCount}/{edges.length}
            </Badge>
          </>
        )}
        {isEditMode && (
          <Badge variant="default" className="bg-amber-600">
            编辑模式
          </Badge>
        )}
        <div className="flex-1" />

        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleNewModule(); }}>
          <FilePlus className="mr-1 h-4 w-4" /> 新建模组
        </Button>
        <Button
          variant={isEditMode ? "default" : "outline"}
          size="sm"
          onClick={(e) => { e.stopPropagation(); handleModeToggle(); }}
        >
          {isEditMode ? (
            <><Eye className="mr-1 h-4 w-4" /> 展示模式</>
          ) : (
            <><Pencil className="mr-1 h-4 w-4" /> 编辑模式</>
          )}
        </Button>
        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleAutoLayout(); }}>
          <LayoutGrid className="mr-1 h-4 w-4" /> 一键排版
        </Button>
        {!isEditMode && (
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleReset(); }}>
            <RotateCcw className="mr-1 h-4 w-4" /> 重置
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleExport(); }}>
          <Download className="mr-1 h-4 w-4" /> 导出
        </Button>
        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleImport(); }}>
          <Upload className="mr-1 h-4 w-4" /> 导入
        </Button>
      </div>

      <AnimatePresence initial={false}>
      {clueExpanded && (
      <motion.div
        key="clue-content"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="overflow-hidden"
      >

      <p className="text-sm text-muted-foreground">
        {isEditMode ? (
          <>
            <strong>编辑模式</strong>：点击节点旁「+」添加线索，从Handle拖拽连线，双击编辑节点/边，Delete键删除。
          </>
        ) : (
          <>
            点击<strong>关系标签</strong>（边上的文字）触发发现，自动标记两端线索。点击未发现的<strong>节点</strong>可直接发现（需说明原因）。双击有图片的节点可放大查看。
          </>
        )}
      </p>

      {/* DAG 图 */}
      <div className="h-[calc(100vh-240px)] min-h-[400px] overflow-hidden rounded-lg border bg-card dag-container">
        <ReactFlow
          nodes={nodesWithEditCallbacks}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onEdgeClick={handleEdgeClick}
          onNodeClick={isEditMode ? undefined : handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onEdgeDoubleClick={handleEdgeDoubleClick}
          onConnect={isEditMode ? handleConnect : undefined}
          onNodesDelete={isEditMode ? handleNodesDelete : undefined}
          onEdgesDelete={isEditMode ? handleEdgesDelete : undefined}
          connectionMode={isEditMode ? ConnectionMode.Loose : ConnectionMode.Strict}
          deleteKeyCode={isEditMode ? ["Backspace", "Delete"] : null}
          connectionLineStyle={{
            stroke: "var(--primary)",
            strokeWidth: 2,
            strokeDasharray: "5 5",
          }}
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

      </motion.div>
      )}
      </AnimatePresence>

      {/* ===== 分割线 ===== */}
      <div className="relative py-2">
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* ===== 任务关系网 ===== */}
      <TaskFlowSection />

      {/* 展示模式：直接发现弹窗 */}
      <DirectDiscoverDialog
        open={discoverDialog.open}
        onOpenChange={(open) => setDiscoverDialog((prev) => ({ ...prev, open }))}
        nodeLabel={discoverDialog.nodeLabel}
        onConfirm={handleDirectDiscover}
      />

      {/* 编辑模式：节点编辑弹窗 */}
      <NodeEditDialog
        open={nodeEditDialog.open}
        onOpenChange={(open) => setNodeEditDialog((prev) => ({ ...prev, open }))}
        mode={nodeEditDialog.mode}
        initialData={nodeEditDialog.initialData}
        onConfirm={handleNodeEditConfirm}
      />

      {/* 编辑模式：边编辑弹窗 */}
      <EdgeEditDialog
        open={edgeEditDialog.open}
        onOpenChange={(open) => setEdgeEditDialog((prev) => ({ ...prev, open }))}
        initialAction={edgeEditDialog.initialAction}
        onConfirm={handleEdgeEditConfirm}
      />

      {/* 图片预览弹窗 */}
      <ImagePreviewDialog
        open={imagePreview.open}
        onOpenChange={(open) => setImagePreview((prev) => ({ ...prev, open }))}
        imageUrl={imagePreview.imageUrl}
        nodeLabel={imagePreview.nodeLabel}
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
