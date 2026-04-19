import { z } from "zod/v4";
import type { ExportData } from "@/types";

// === Zod Schemas for validation ===

const ModuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["prepared", "pending", "completed"]),
  description: z.string(),
  playerCount: z.string(),
  duration: z.string(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const ProfileSchema = z.object({
  name: z.string(),
  avatar: z.string(),
  bio: z.string(),
  disclaimer: z.string(),
  modules: z.array(ModuleSchema),
});

const ClueNodeDataSchema = z.object({
  label: z.string(),
  description: z.string(),
  discovered: z.boolean(),
  directDiscoveryNote: z.string().optional(),
  category: z.string(),
  imageData: z.string().optional(),
}).passthrough();

const ClueNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: ClueNodeDataSchema,
});

const ClueEdgeDataSchema = z.object({
  action: z.string(),
  triggered: z.boolean(),
}).passthrough();

const ClueEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  animated: z.boolean(),
  data: ClueEdgeDataSchema,
});

const ModuleClueDataSchema = z.object({
  moduleId: z.string(),
  moduleName: z.string(),
  nodes: z.array(ClueNodeSchema),
  edges: z.array(ClueEdgeSchema),
});

const ExportDataSchema = z.object({
  version: z.string(),
  exportedAt: z.string(),
  profile: ProfileSchema.optional(),
  modules: z.array(ModuleClueDataSchema).optional(),
});

// === Export ===

export function exportToJson(data: ExportData): string {
  return JSON.stringify(data, null, 2);
}

export function downloadJson(data: ExportData, filename: string) {
  const json = exportToJson(data);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// === Import ===

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function importFromJson(file: File): Promise<ExportData> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("文件过大，最大支持 5MB");
  }

  if (!file.name.endsWith(".json")) {
    throw new Error("请选择 JSON 文件");
  }

  const text = await file.text();
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("JSON 格式错误，无法解析");
  }

  const result = ExportDataSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`数据格式校验失败：${result.error.message}`);
  }

  return result.data;
}
