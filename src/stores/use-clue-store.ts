import { useState, useCallback } from "react";
import type { ModuleClueData, ClueNode, ClueEdge } from "@/types";

const STORAGE_KEY = "trpg-clue-data";
const DATA_VERSION = "1.1"; // 递增以强制刷新旧 localStorage 数据

// 多对多示例模组：展示复杂的线索关系网络
const demoData: ModuleClueData = {
  moduleId: "demo",
  moduleName: "示例模组：迷雾之城",
  nodes: [
    { id: "n1", type: "clueNode", position: { x: 300, y: 0 }, data: { label: "神秘信件", description: "在书房发现的密封信件，提到了多个地点", discovered: false, category: "core" } },
    { id: "n2", type: "clueNode", position: { x: 100, y: 150 }, data: { label: "破碎花瓶", description: "客厅角落的碎片，似乎藏着什么", discovered: false, category: "important" } },
    { id: "n3", type: "clueNode", position: { x: 500, y: 150 }, data: { label: "主人日记", description: "记录了主人最后几天的生活", discovered: false, category: "core" } },
    { id: "n4", type: "clueNode", position: { x: 0, y: 300 }, data: { label: "地下室钥匙", description: "藏在花瓶碎片之下", discovered: false, category: "important" } },
    { id: "n5", type: "clueNode", position: { x: 300, y: 300 }, data: { label: "密码纸条", description: "写着一串意义不明的数字", discovered: false, category: "optional" } },
    { id: "n6", type: "clueNode", position: { x: 600, y: 300 }, data: { label: "陌生人合影", description: "一张模糊的老照片", discovered: false, category: "optional" } },
    { id: "n7", type: "clueNode", position: { x: 150, y: 450 }, data: { label: "密室入口", description: "需要钥匙和密码才能打开", discovered: false, category: "core" } },
    { id: "n8", type: "clueNode", position: { x: 450, y: 450 }, data: { label: "仪式祭坛", description: "密室中央的诡异祭坛", discovered: false, category: "core" } },
    { id: "n9", type: "clueNode", position: { x: 300, y: 600 }, data: { label: "远古符文", description: "祭坛上刻着的未知文字", discovered: false, category: "core" } },
  ],
  edges: [
    // 多对多：信件引出多条线索
    { id: "e1", source: "n1", target: "n2", animated: true, data: { action: "阅读信件", triggered: false } },
    { id: "e2", source: "n1", target: "n3", animated: true, data: { action: "阅读信件", triggered: false } },
    { id: "e3", source: "n1", target: "n6", animated: true, data: { action: "辨认笔迹", triggered: false } },
    // 多对一：多条线索指向钥匙
    { id: "e4", source: "n2", target: "n4", animated: true, data: { action: "搜索碎片", triggered: false } },
    { id: "e5", source: "n3", target: "n4", animated: true, data: { action: "日记提示", triggered: false } },
    // 日记引出多条线索
    { id: "e6", source: "n3", target: "n5", animated: true, data: { action: "翻阅夹层", triggered: false } },
    { id: "e7", source: "n3", target: "n6", animated: true, data: { action: "辨认照片", triggered: false } },
    // 多对一：密室需要钥匙和密码
    { id: "e8", source: "n4", target: "n7", animated: true, data: { action: "使用钥匙", triggered: false } },
    { id: "e9", source: "n5", target: "n7", animated: true, data: { action: "输入密码", triggered: false } },
    // 密室到祭坛（照片也提供线索）
    { id: "e10", source: "n7", target: "n8", animated: true, data: { action: "进入密室", triggered: false } },
    { id: "e11", source: "n6", target: "n8", animated: true, data: { action: "照片背面地图", triggered: false } },
    // 祭坛到符文
    { id: "e12", source: "n8", target: "n9", animated: true, data: { action: "调查祭坛", triggered: false } },
    // 越级指向：跨层级的线索关联
    { id: "e13", source: "n7", target: "n3", animated: true, data: { action: "密室中发现日记线索", triggered: false } },
    { id: "e14", source: "n6", target: "n7", animated: true, data: { action: "照片提示密室位置", triggered: false } },
    // 环形边：符文反过来指向信件（古老符文与信件笔迹相同，形成闭环线索）
    { id: "e15", source: "n9", target: "n1", animated: true, data: { action: "符文笔迹与信件吻合", triggered: false } },
  ],
};

function loadClueData(): ModuleClueData {
  try {
    const ver = localStorage.getItem(STORAGE_KEY + "-version");
    if (ver === DATA_VERSION) {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as ModuleClueData;
    }
  } catch {
    // ignore
  }
  return demoData;
}

function saveClueData(data: ModuleClueData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(STORAGE_KEY + "-version", DATA_VERSION);
  } catch {
    console.warn("localStorage 存储失败，可能超出容量限制");
  }
}

export function useClueStore() {
  const [clueData, setClueDataState] = useState<ModuleClueData>(loadClueData);

  const setClueData = useCallback((data: ModuleClueData) => {
    setClueDataState(data);
    saveClueData(data);
  }, []);

  /** 触发一条边（关系），自动标记边两端节点为已发现 */
  const triggerEdge = useCallback((edgeId: string) => {
    setClueDataState((prev) => {
      const edge = prev.edges.find((e) => e.id === edgeId);
      if (!edge) return prev;

      const next: ModuleClueData = {
        ...prev,
        edges: prev.edges.map((e) =>
          e.id === edgeId ? { ...e, data: { ...e.data, triggered: !e.data.triggered } } : e
        ),
        nodes: prev.nodes.map((n) => {
          if (n.id === edge.source || n.id === edge.target) {
            // 如果取消触发，检查是否还有其他已触发的边连接此节点
            const nowTriggered = !edge.data.triggered;
            if (!nowTriggered) {
              const hasOtherTriggeredEdge = prev.edges.some(
                (otherE) =>
                  otherE.id !== edgeId &&
                  otherE.data.triggered &&
                  (otherE.source === n.id || otherE.target === n.id)
              );
              // 如果有直接发现说明，保持发现状态
              if (!hasOtherTriggeredEdge && !n.data.directDiscoveryNote) {
                return { ...n, data: { ...n.data, discovered: false } };
              }
              return n;
            }
            return { ...n, data: { ...n.data, discovered: true } };
          }
          return n;
        }),
      };
      saveClueData(next);
      return next;
    });
  }, []);

  /** 直接发现节点（特殊情况，需要附带说明） */
  const directDiscoverNode = useCallback((nodeId: string, note: string) => {
    setClueDataState((prev) => {
      const next: ModuleClueData = {
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, discovered: true, directDiscoveryNote: note } }
            : n
        ),
      };
      saveClueData(next);
      return next;
    });
  }, []);

  /** 取消直接发现（清除 directDiscoveryNote，检查是否还有已触发边） */
  const cancelDirectDiscovery = useCallback((nodeId: string) => {
    setClueDataState((prev) => {
      const next: ModuleClueData = {
        ...prev,
        nodes: prev.nodes.map((n) => {
          if (n.id !== nodeId) return n;
          const hasTriggeredEdge = prev.edges.some(
            (e) => e.data.triggered && (e.source === n.id || e.target === n.id)
          );
          return {
            ...n,
            data: {
              ...n.data,
              discovered: hasTriggeredEdge,
              directDiscoveryNote: undefined,
            },
          };
        }),
      };
      saveClueData(next);
      return next;
    });
  }, []);

  /** 重置所有发现状态 */
  const resetAll = useCallback(() => {
    setClueDataState((prev) => {
      const next: ModuleClueData = {
        ...prev,
        nodes: prev.nodes.map((n) => ({
          ...n,
          data: { ...n.data, discovered: false, directDiscoveryNote: undefined },
        })),
        edges: prev.edges.map((e) => ({
          ...e,
          data: { ...e.data, triggered: false },
        })),
      };
      saveClueData(next);
      return next;
    });
  }, []);

  /** 创建新的空白模组 */
  const createNewModule = useCallback((moduleName: string) => {
    const newData: ModuleClueData = {
      moduleId: crypto.randomUUID(),
      moduleName,
      nodes: [
        {
          id: "start",
          type: "clueNode",
          position: { x: 300, y: 50 },
          data: { label: "模组开始", description: "线索图的起点", discovered: false, category: "core" },
        },
      ],
      edges: [],
    };
    setClueDataState(newData);
    saveClueData(newData);
    return newData;
  }, []);

  /** 添加节点 */
  const addNode = useCallback((node: ClueNode) => {
    setClueDataState((prev) => {
      const next = { ...prev, nodes: [...prev.nodes, node] };
      saveClueData(next);
      return next;
    });
  }, []);

  /** 添加边 */
  const addEdge = useCallback((edge: ClueEdge) => {
    setClueDataState((prev) => {
      const next = { ...prev, edges: [...prev.edges, edge] };
      saveClueData(next);
      return next;
    });
  }, []);

  /** 更新节点数据 */
  const updateNode = useCallback((nodeId: string, data: Partial<ClueNode["data"]>) => {
    setClueDataState((prev) => {
      const next = {
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
        ),
      };
      saveClueData(next);
      return next;
    });
  }, []);

  /** 更新边数据 */
  const updateEdge = useCallback((edgeId: string, data: Partial<ClueEdge["data"]>) => {
    setClueDataState((prev) => {
      const next = {
        ...prev,
        edges: prev.edges.map((e) =>
          e.id === edgeId ? { ...e, data: { ...e.data, ...data } } : e
        ),
      };
      saveClueData(next);
      return next;
    });
  }, []);

  /** 删除节点及其关联的边 */
  const deleteNode = useCallback((nodeId: string) => {
    setClueDataState((prev) => {
      const next = {
        ...prev,
        nodes: prev.nodes.filter((n) => n.id !== nodeId),
        edges: prev.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      };
      saveClueData(next);
      return next;
    });
  }, []);

  /** 删除边 */
  const deleteEdge = useCallback((edgeId: string) => {
    setClueDataState((prev) => {
      const next = {
        ...prev,
        edges: prev.edges.filter((e) => e.id !== edgeId),
      };
      saveClueData(next);
      return next;
    });
  }, []);

  return {
    clueData, setClueData, triggerEdge, directDiscoverNode, cancelDirectDiscovery, resetAll,
    createNewModule, addNode, addEdge, updateNode, updateEdge, deleteNode, deleteEdge,
  };
}
