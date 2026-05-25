// === TAB1: Profile & Module Types ===

export type ModuleStatus = "prepared" | "pending" | "completed";

export interface Module {
  id: string;
  name: string;
  status: ModuleStatus;
  description: string;
  playerCount: string;
  duration: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProfileData {
  name: string;
  avatar: string;
  bio: string;
  disclaimer: string;
  modules: Module[];
}

// === TAB2: Clue DAG Types ===

export interface ClueNodeData {
  label: string;
  description: string;
  discovered: boolean;
  /** 直接发现时的补充说明 */
  directDiscoveryNote?: string;
  category: string;
  /** 节点关联的图片（base64 data URL） */
  imageData?: string;
  [key: string]: unknown;
}

export interface ClueEdgeData {
  /** 关系动作描述，如"阅读"、"调查"、"询问" */
  action: string;
  /** 该关系是否已被触发 */
  triggered: boolean;
  [key: string]: unknown;
}

export interface ModuleClueData {
  moduleId: string;
  moduleName: string;
  nodes: ClueNode[];
  edges: ClueEdge[];
}

export interface ClueNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: ClueNodeData;
}

export interface ClueEdge {
  id: string;
  source: string;
  target: string;
  animated: boolean;
  data: ClueEdgeData;
}

// === TAB2: Task Network Types ===

export type TaskStatus = "pending" | "in_progress" | "completed" | "failed";
export type TaskPriority = "low" | "medium" | "high";

export interface TaskNodeData {
  label: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: string;
  [key: string]: unknown;
}

export interface TaskNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: TaskNodeData;
}

export interface TaskEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  data?: { label?: string; [key: string]: unknown };
}

export interface ModuleTaskData {
  moduleId: string;
  nodes: TaskNode[];
  edges: TaskEdge[];
}

// === TAB3: Blog Types ===

export interface BlogPost {
  id: string;
  title: string;
  file?: string;
  cover?: string[];
  content?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// === Export/Import ===

export interface ExportData {
  version: string;
  exportedAt: string;
  profile?: ProfileData;
  modules?: ModuleClueData[];
  posts?: BlogPost[];
}
