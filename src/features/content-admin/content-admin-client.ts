import { loadAiGatewayUrl } from "@/features/ai/ai-gateway-client";
import type { WikiEntryRecord, WikiIndexEntry, WikiModule, WikiPlayer } from "@/types/wiki";

export interface BlogPostDocument {
  id: string;
  title: string;
  cover?: string[];
  tags: string[];
  players?: string[];
  renderMode: "markdown" | "wiki";
  wikiEntryId?: string;
  createdAt: string;
  updatedAt: string;
  markdown: string;
}

export interface BlogPostSummary extends Omit<BlogPostDocument, "markdown"> {
  file: string;
}

export interface ContentOverview {
  blogs: BlogPostSummary[];
  wikiEntries: WikiIndexEntry[];
  players: WikiPlayer[];
  modules: WikiModule[];
}

export interface ImageUploadResult {
  url: string;
  size: number;
  mimeType: string;
}

export interface ContentImportResult {
  blogPosts: number;
  wikiEntries: number;
  uploadedFiles: number;
  backupFile: string;
}

async function contentRequest(path: string, token: string, options: RequestInit = {}): Promise<Response> {
  const baseUrl = await loadAiGatewayUrl();
  const headers = new Headers(options.headers);
  headers.set("authorization", `Bearer ${token}`);
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  if (!response.ok) {
    const data = await response.text();
    try {
      const parsed = JSON.parse(data) as { error?: string };
      throw new Error(parsed.error || data || `内容后台请求失败：${response.status}`);
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error(data || `内容后台请求失败：${response.status}`);
      throw error;
    }
  }
  return response;
}

async function requestJson<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof Blob)) headers.set("content-type", "application/json");
  const response = await contentRequest(path, token, { ...options, headers });
  return response.json() as Promise<T>;
}

export function fetchContentOverview(token: string): Promise<ContentOverview> {
  return requestJson("/api/admin/content/overview", token);
}

export function fetchBlogDocument(token: string, id: string): Promise<BlogPostDocument> {
  return requestJson(`/api/admin/content/blog/${encodeURIComponent(id)}`, token);
}

export function saveBlogDocument(token: string, document: BlogPostDocument): Promise<BlogPostDocument> {
  return requestJson(`/api/admin/content/blog/${encodeURIComponent(document.id)}`, token, {
    method: "PUT",
    body: JSON.stringify(document)
  });
}

export function fetchWikiDocument(token: string, id: string): Promise<WikiEntryRecord> {
  return requestJson(`/api/admin/content/wiki/${encodeURIComponent(id)}`, token);
}

export function saveWikiDocument(token: string, document: WikiEntryRecord): Promise<WikiEntryRecord> {
  return requestJson(`/api/admin/content/wiki/${encodeURIComponent(document.id)}`, token, {
    method: "PUT",
    body: JSON.stringify(document)
  });
}

export async function uploadContentImage(token: string, file: File): Promise<ImageUploadResult> {
  const response = await contentRequest(
    `/api/admin/content/images?fileName=${encodeURIComponent(file.name)}`,
    token,
    { method: "POST", headers: { "content-type": file.type }, body: file }
  );
  return response.json() as Promise<ImageUploadResult>;
}

export async function exportContentZip(token: string): Promise<{ blob: Blob; fileName: string }> {
  const response = await contentRequest("/api/admin/content/export", token);
  const disposition = response.headers.get("content-disposition") || "";
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return { blob: await response.blob(), fileName: match?.[1] || "trpg-content-backup.zip" };
}

export async function importContentZip(token: string, file: File): Promise<ContentImportResult> {
  const response = await contentRequest("/api/admin/content/import", token, {
    method: "POST",
    headers: { "content-type": "application/zip" },
    body: file
  });
  return response.json() as Promise<ContentImportResult>;
}
