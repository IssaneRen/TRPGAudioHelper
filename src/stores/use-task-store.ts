import { useSyncExternalStore } from "react";
import { z } from "zod/v4";
import type { ModuleTaskData, TaskNode, TaskEdge } from "@/types";

const STORAGE_KEY = "trpg-task-data";

// ─── Zod Schemas ───

const TaskNodeDataSchema = z.object({
  label: z.string(),
  description: z.string(),
  status: z.enum(["pending", "in_progress", "completed", "failed"]),
  priority: z.enum(["low", "medium", "high"]),
  assignee: z.string().optional(),
});

const TaskNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: TaskNodeDataSchema,
});

const TaskEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
  data: z.object({ label: z.string().optional() }).passthrough().optional(),
});

const ModuleTaskDataSchema = z.object({
  moduleId: z.string(),
  nodes: z.array(TaskNodeSchema),
  edges: z.array(TaskEdgeSchema),
});

// ─── Demo Data ───

const demoData: ModuleTaskData = {
  moduleId: "demo",
  nodes: [
    { id: "t1", type: "taskNode", position: { x: 200, y: 0 }, data: { label: "搜索书房", description: "在书房中寻找线索", status: "completed", priority: "high" } },
    { id: "t2", type: "taskNode", position: { x: 0, y: 150 }, data: { label: "询问管家", description: "向管家了解事件经过", status: "in_progress", priority: "medium" } },
    { id: "t3", type: "taskNode", position: { x: 400, y: 150 }, data: { label: "调查花园", description: "在花园中搜索可疑痕迹", status: "pending", priority: "medium" } },
    { id: "t4", type: "taskNode", position: { x: 200, y: 300 }, data: { label: "打开密室", description: "使用收集到的线索打开密室", status: "pending", priority: "high" } },
    { id: "t5", type: "taskNode", position: { x: 200, y: 450 }, data: { label: "最终对峙", description: "面对真相", status: "pending", priority: "high" } },
  ],
  edges: [
    { id: "te1", source: "t1", target: "t2", data: { label: "发现线索后" } },
    { id: "te2", source: "t1", target: "t3", data: { label: "发现线索后" } },
    { id: "te3", source: "t2", target: "t4", data: { label: "获取信息" } },
    { id: "te4", source: "t3", target: "t4", data: { label: "找到钥匙" } },
    { id: "te5", source: "t4", target: "t5", data: { label: "进入密室" } },
  ],
};

// ─── Singleton Store ───

type Listener = () => void;

function loadFromStorage(): ModuleTaskData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const result = ModuleTaskDataSchema.safeParse(parsed);
      if (result.success) return result.data as ModuleTaskData;
      console.warn("[TaskStore] localStorage 数据校验失败，使用默认数据:", result.error);
    }
  } catch (err) {
    console.warn("[TaskStore] localStorage 读取失败:", err);
  }
  return demoData;
}

function saveToStorage(data: ModuleTaskData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("[TaskStore] localStorage 写入失败:", err);
  }
}

function createTaskStore() {
  let state: ModuleTaskData = loadFromStorage();
  const listeners = new Set<Listener>();

  function emit() {
    for (const listener of listeners) {
      listener();
    }
  }

  function setState(next: ModuleTaskData) {
    state = next;
    saveToStorage(next);
    emit();
  }

  return {
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    getSnapshot(): ModuleTaskData {
      return state;
    },

    addNode(node: TaskNode) {
      setState({ ...state, nodes: [...state.nodes, node] });
    },

    updateNode(id: string, data: Partial<TaskNode["data"]>) {
      setState({
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...data } } : n
        ),
      });
    },

    updateNodePosition(id: string, position: { x: number; y: number }) {
      setState({
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === id ? { ...n, position } : n
        ),
      });
    },

    deleteNode(id: string) {
      setState({
        ...state,
        nodes: state.nodes.filter((n) => n.id !== id),
        edges: state.edges.filter((e) => e.source !== id && e.target !== id),
      });
    },

    addEdge(edge: TaskEdge) {
      setState({ ...state, edges: [...state.edges, edge] });
    },

    deleteEdge(id: string) {
      setState({ ...state, edges: state.edges.filter((e) => e.id !== id) });
    },

    setTaskData(data: ModuleTaskData) {
      setState(data);
    },
  };
}

// 全局单例
const taskStore = createTaskStore();

export function useTaskStore() {
  const taskData = useSyncExternalStore(
    taskStore.subscribe,
    taskStore.getSnapshot,
  );

  return {
    taskData,
    addNode: taskStore.addNode,
    updateNode: taskStore.updateNode,
    updateNodePosition: taskStore.updateNodePosition,
    deleteNode: taskStore.deleteNode,
    addEdge: taskStore.addEdge,
    deleteEdge: taskStore.deleteEdge,
    setTaskData: taskStore.setTaskData,
  };
}
