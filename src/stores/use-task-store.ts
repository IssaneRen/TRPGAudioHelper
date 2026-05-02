import { useState, useCallback } from "react";
import type { ModuleTaskData, TaskNode, TaskEdge } from "@/types";

const STORAGE_KEY = "trpg-task-data";

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

function loadFromStorage(): ModuleTaskData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.nodes && parsed.edges) return parsed;
    }
  } catch { /* ignore */ }
  return demoData;
}

function saveToStorage(data: ModuleTaskData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("[TaskStore] localStorage 写入失败:", err);
  }
}

export function useTaskStore() {
  const [taskData, setTaskData] = useState<ModuleTaskData>(loadFromStorage);

  const persist = useCallback((data: ModuleTaskData) => {
    setTaskData(data);
    saveToStorage(data);
  }, []);

  const addNode = useCallback((node: TaskNode) => {
    setTaskData((prev) => {
      const next = { ...prev, nodes: [...prev.nodes, node] };
      saveToStorage(next);
      return next;
    });
  }, []);

  const updateNode = useCallback((id: string, data: Partial<TaskNode["data"]>) => {
    setTaskData((prev) => {
      const next = {
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...data } } : n
        ),
      };
      saveToStorage(next);
      return next;
    });
  }, []);

  const deleteNode = useCallback((id: string) => {
    setTaskData((prev) => {
      const next = {
        ...prev,
        nodes: prev.nodes.filter((n) => n.id !== id),
        edges: prev.edges.filter((e) => e.source !== id && e.target !== id),
      };
      saveToStorage(next);
      return next;
    });
  }, []);

  const addEdge = useCallback((edge: TaskEdge) => {
    setTaskData((prev) => {
      const next = { ...prev, edges: [...prev.edges, edge] };
      saveToStorage(next);
      return next;
    });
  }, []);

  const deleteEdge = useCallback((id: string) => {
    setTaskData((prev) => {
      const next = { ...prev, edges: prev.edges.filter((e) => e.id !== id) };
      saveToStorage(next);
      return next;
    });
  }, []);

  const setTaskData_ = useCallback((data: ModuleTaskData) => {
    persist(data);
  }, [persist]);

  return {
    taskData,
    addNode,
    updateNode,
    deleteNode,
    addEdge,
    deleteEdge,
    setTaskData: setTaskData_,
  };
}
