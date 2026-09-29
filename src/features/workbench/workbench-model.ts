import { z } from "zod";
import type { Learning, Plan, Work, WorkbenchData, WorkKind } from "./workbench-client";

export const workKinds: Array<[WorkKind, string]> = [["ai-comic", "AI 漫剧"], ["trpg-log", "跑团 Log"], ["ai-image", "AI 生图"], ["ai-novel", "AI 小说"], ["novel", "自写小说"], ["html", "HTML 作品"]];
export const kindLabel = (kind: WorkKind) => workKinds.find(([id]) => id === kind)?.[1] ?? kind;
export const planLabels = { todo: "待开始", doing: "进行中", done: "已完成" };
export const learningLabels = { planned: "待学习", learning: "实践中", learned: "已掌握" };
export const makeId = () => crypto.randomUUID().replace(/-/g, "");
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const newPlan = (title = "", dueDate = ""): Plan => ({ id: makeId(), title, dueDate, detail: "", status: "todo" });
export const newLearning = (): Learning => ({ id: makeId(), title: "", vendor: "", model: "", work: "", workflow: "", notes: "", status: "planned" });
export const newWork = (kind: WorkKind = "novel"): Work => ({ id: makeId(), title: "", kind, summary: "", body: "", coverUrl: "", status: "draft", updatedAt: new Date().toISOString() });

export type DateFilter = "all" | "today" | "week" | "overdue";
export function matchesDate(plan: Plan, filter: DateFilter, now = new Date()) {
  const today = localDate(now);
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + (7 - (now.getDay() || 7)));
  if (filter === "all") return true;
  if (filter === "today") return plan.dueDate === today;
  if (filter === "overdue") return plan.status !== "done" && Boolean(plan.dueDate) && plan.dueDate < today;
  return Boolean(plan.dueDate) && plan.dueDate >= today && plan.dueDate <= localDate(weekEnd);
}

export function focusPlans(plans: Plan[], now = new Date()) {
  const today = localDate(now);
  return plans.filter((p) => p.status !== "done").sort((a, b) => {
    const rank = (p: Plan) => p.dueDate && p.dueDate <= today ? 0 : p.status === "doing" ? 1 : 2;
    return rank(a) - rank(b) || (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
  });
}

const id = z.string().max(80).regex(/^[a-zA-Z0-9_-]+$/);
const title = z.string().max(200);
const longText = z.string().max(100_000);
const planSchema = z.object({ id, title, detail: longText, dueDate: z.string().max(40), status: z.enum(["todo", "doing", "done"]) });
const learningSchema = z.object({ id, title, vendor: z.string().max(100), model: z.string().max(100), work: z.string().max(100), workflow: longText, notes: longText, status: z.enum(["planned", "learning", "learned"]) });
const workSchema = z.object({ id, title, kind: z.enum(["ai-comic", "trpg-log", "ai-image", "ai-novel", "novel", "html"]), summary: z.string().max(2000), body: z.string().max(500_000), coverUrl: z.string().max(2000), status: z.enum(["draft", "published"]), updatedAt: z.string().max(50) });
const backupSchema = z.object({ version: z.literal(1), plans: z.array(planSchema).max(1000), learning: z.array(learningSchema).max(1000), works: z.array(workSchema).max(1000) });

export function parseBackup(value: unknown): WorkbenchData {
  const result = backupSchema.safeParse(value);
  if (!result.success) throw new Error("备份格式不完整，或字段超出容量限制。请使用工作台导出的 v1 JSON。");
  for (const rows of [result.data.plans, result.data.learning, result.data.works]) {
    if (new Set(rows.map((row) => row.id)).size !== rows.length) throw new Error("备份包含重复编号，未导入任何数据。");
  }
  if (new TextEncoder().encode(JSON.stringify(result.data)).length > 2 * 1024 * 1024) throw new Error("工作台数据超过 2 MB，请精简正文或使用媒体链接。");
  return result.data;
}
