import { useCallback, useState, useMemo, useEffect } from "react";
import { generateUUID } from "@/utils/uuid";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  MarkerType,
} from "@xyflow/react";
import { motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useTaskStore } from "@/stores/use-task-store";
import { TaskNodeType } from "./TaskNode";
import type { TaskStatus, TaskPriority } from "@/types";

const nodeTypes = { taskNode: TaskNodeType };

const defaultEdgeOptions = {
  type: "default" as const,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 14,
    height: 14,
    color: "var(--primary)",
  },
  style: { stroke: "var(--primary)", strokeWidth: 1.5, strokeDasharray: "6 3" },
};

function buildNodes(store: ReturnType<typeof useTaskStore>): Node[] {
  return store.taskData.nodes.map((n) => ({
    ...n,
    type: n.type || "taskNode",
  }));
}

function buildEdges(store: ReturnType<typeof useTaskStore>): Edge[] {
  return store.taskData.edges.map((e) => ({
    ...e,
    ...defaultEdgeOptions,
    label: e.data?.label || e.label || "",
    labelStyle: { fontSize: 10, fill: "var(--muted-foreground)" },
    labelBgStyle: { fill: "var(--card)", fillOpacity: 0.8 },
  }));
}

export function TaskFlowSection() {
  const store = useTaskStore();
  const [nodes, setNodes, onNodesChangeBase] = useNodesState(buildNodes(store));
  const [edges, setEdges, onEdgesChange] = useEdgesState(buildEdges(store));
  const [editMode, setEditMode] = useState(false);

  // store 数据变化时同步到 ReactFlow
  useEffect(() => {
    setNodes(buildNodes(store));
    setEdges(buildEdges(store));
  }, [store.taskData, setNodes, setEdges]);

  // 包装 onNodesChange：拖拽结束时同步 position 到 store
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChangeBase(changes);
    for (const change of changes) {
      if (change.type === "position" && change.position && change.dragging === false) {
        store.updateNodePosition(change.id, change.position);
      }
    }
  }, [onNodesChangeBase, store]);

  const statusCounts = useMemo(() => {
    const counts: Record<TaskStatus, number> = { pending: 0, in_progress: 0, completed: 0, failed: 0 };
    for (const n of nodes) {
      const s = (n.data?.status as TaskStatus) || "pending";
      counts[s]++;
    }
    return counts;
  }, [nodes]);

  // 添加新任务节点
  const handleAddTask = useCallback(() => {
    const id = `t-${generateUUID().slice(0, 8)}`;
    const newNode: Node = {
      id,
      type: "taskNode",
      position: { x: Math.random() * 300 + 50, y: Math.random() * 200 + 50 },
      data: {
        label: "新任务",
        description: "",
        status: "pending" as TaskStatus,
        priority: "medium" as TaskPriority,
      },
    };
    setNodes((nds) => [...nds, newNode]);
    store.addNode({
      id,
      type: "taskNode",
      position: newNode.position,
      data: newNode.data as { label: string; description: string; status: TaskStatus; priority: TaskPriority },
    });
    toast.success("已添加新任务");
  }, [setNodes, store]);

  // 连线
  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    if (connection.source === connection.target) return;
    const newEdgeId = `te-${generateUUID().slice(0, 8)}`;
    const newEdge: Edge = {
      id: newEdgeId,
      source: connection.source,
      target: connection.target,
      ...defaultEdgeOptions,
      label: "依赖",
      labelStyle: { fontSize: 10, fill: "var(--muted-foreground)" },
      labelBgStyle: { fill: "var(--card)", fillOpacity: 0.8 },
    };
    setEdges((eds) => [...eds, newEdge]);
    store.addEdge({ id: newEdgeId, source: connection.source, target: connection.target, data: { label: "依赖" } });
  }, [setEdges, store]);

  // 双击节点循环切换状态
  const handleNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const order: TaskStatus[] = ["pending", "in_progress", "completed", "failed"];
    const current = (node.data?.status as TaskStatus) || "pending";
    const nextIdx = (order.indexOf(current) + 1) % order.length;
    const nextStatus = order[nextIdx];

    setNodes((nds) =>
      nds.map((n) =>
        n.id === node.id ? { ...n, data: { ...n.data, status: nextStatus } } : n
      )
    );
    store.updateNode(node.id, { status: nextStatus });

    const labels: Record<TaskStatus, string> = { pending: "待办", in_progress: "进行中", completed: "已完成", failed: "失败" };
    toast(`「${node.data?.label}」→ ${labels[nextStatus]}`, { duration: 1200 });
  }, [setNodes, store]);

  // 删除节点
  const handleNodesDelete = useCallback((deleted: Node[]) => {
    for (const node of deleted) {
      store.deleteNode(node.id);
    }
    toast.success(`已删除 ${deleted.length} 个任务`);
  }, [store]);

  const handleEdgesDelete = useCallback((deleted: Edge[]) => {
    for (const edge of deleted) {
      store.deleteEdge(edge.id);
    }
  }, [store]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* 标题栏 */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h3 className="text-lg font-bold">任务关系网</h3>
        <Badge variant="secondary" className="text-xs">
          {statusCounts.completed}/{nodes.length} 完成
        </Badge>
        {statusCounts.in_progress > 0 && (
          <Badge variant="outline" className="text-xs text-emerald-600 dark:text-emerald-400">
            {statusCounts.in_progress} 进行中
          </Badge>
        )}
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={handleAddTask}>
          <Plus className="mr-1 h-3.5 w-3.5" /> 添加任务
        </Button>
        <Button
          variant={editMode ? "default" : "outline"}
          size="sm"
          onClick={() => setEditMode((v) => !v)}
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          {editMode ? "退出编辑" : "编辑"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mb-2">
        双击任务切换状态 · 拖拽Handle连线 · {editMode ? "Delete键删除节点/边" : "点击「编辑」开启删除功能"}
      </p>

      {/* 任务关系图 */}
      <div className="h-[400px] rounded-lg border bg-card/50 overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodesDelete={editMode ? handleNodesDelete : undefined}
          onEdgesDelete={editMode ? handleEdgesDelete : undefined}
          deleteKeyCode={editMode ? ["Backspace", "Delete"] : null}
          fitView
          minZoom={0.5}
          maxZoom={2}
          panOnDrag
          zoomOnPinch
          panOnScroll
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} size={1} />
          <Controls className="!bg-background !border-border !shadow-sm" showInteractive={false} />
        </ReactFlow>
      </div>
    </motion.div>
  );
}
