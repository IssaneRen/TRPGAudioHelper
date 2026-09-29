import { loadAiGatewayUrl } from "@/features/ai/ai-gateway-client";

export type WorkKind = "ai-comic" | "trpg-log" | "ai-image" | "ai-novel" | "novel" | "html";
export interface Plan { id: string; title: string; detail: string; dueDate: string; status: "todo" | "doing" | "done"; }
export interface Learning { id: string; title: string; vendor: string; model: string; work: string; workflow: string; notes: string; status: "planned" | "learning" | "learned"; }
export interface Work { id: string; title: string; kind: WorkKind; summary: string; body: string; coverUrl: string; status: "draft" | "published"; updatedAt: string; }
export interface WorkbenchData { version: 1; plans: Plan[]; learning: Learning[]; works: Work[]; }
export type WorkSummary = Omit<Work, "body">;

async function request<T>(path: string, token?: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) headers.set("authorization", `Bearer ${token}`);
  if (options.body) headers.set("content-type", "application/json");
  const response = await fetch(`${await loadAiGatewayUrl()}${path}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || `请求失败：${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const readWorkbench = (token: string) => request<WorkbenchData>("/api/admin/workbench", token);
export const saveWorkbench = (token: string, data: WorkbenchData) => request<WorkbenchData>("/api/admin/workbench", token, { method: "PUT", body: JSON.stringify(data) });
export const readPortfolio = () => request<WorkSummary[]>("/api/portfolio");
export const readPublishedWork = (id: string) => request<Work>(`/api/portfolio/${encodeURIComponent(id)}`);
