export interface AiSession {
  playerId?: string;
  displayName: string;
  isKeeper: boolean;
}

export interface AiNpcSummary {
  id: string;
  displayName: string;
  summary?: string;
  role?: string;
  avatarUrl?: string;
}

export interface AiChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

export interface ModuleClueReviewPlayer {
  id: string;
  name: string;
}

export interface ModuleClueReviewClueDto {
  id: string;
  title: string;
  summary?: string;
  detail?: string;
  tags: string[];
  thumbnail?: string;
  order: number;
  reveals: string[];
  visiblePlayerIds?: string[];
}

export interface ModuleClueReviewPayload {
  module: {
    id: string;
    name: string;
  };
  clues: ModuleClueReviewClueDto[];
  edges: Array<{ id: string; source: string; target: string }>;
  tags: string[];
  players?: ModuleClueReviewPlayer[];
}

interface GatewayChatMessage {
  timestamp?: string;
  role: "user" | "assistant" | "system";
  content: string;
}

function isUiChatRole(role: GatewayChatMessage["role"]): role is AiChatMessage["role"] {
  return role === "user" || role === "assistant";
}

export const AI_TOKEN_STORAGE_KEY = "ai-session-token";
export const LEGACY_PL_STORAGE_KEY = "blog-pl-name";

let runtimeConfigPromise: Promise<string> | null = null;

export async function loadAiGatewayUrl(): Promise<string> {
  runtimeConfigPromise ??= fetch("/config/runtime.json", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`运行时配置加载失败：${response.status}`);
      }
      return response.json() as Promise<{ aiGatewayUrl?: string }>;
    })
    .then((config) => config.aiGatewayUrl?.replace(/\/+$/, "") || "");

  const url = await runtimeConfigPromise;
  if (!url) {
    throw new Error("AI 网关地址未配置：请设置 /config/runtime.json");
  }
  return url;
}

export function getStoredAiToken(): string {
  return localStorage.getItem(AI_TOKEN_STORAGE_KEY) || "";
}

export function storeAiToken(token: string) {
  localStorage.setItem(AI_TOKEN_STORAGE_KEY, token);
  localStorage.removeItem(LEGACY_PL_STORAGE_KEY);
  window.dispatchEvent(new Event("ai-session-token-change"));
}

export function clearStoredAiToken() {
  localStorage.removeItem(AI_TOKEN_STORAGE_KEY);
  localStorage.removeItem(LEGACY_PL_STORAGE_KEY);
  window.dispatchEvent(new Event("ai-session-token-change"));
}

async function requestJson<T>(path: string, options: RequestInit & { token?: string } = {}): Promise<T> {
  const aiGatewayUrl = await loadAiGatewayUrl();
  const headers = new Headers(options.headers);
  headers.set("content-type", "application/json");
  if (options.token) headers.set("authorization", `Bearer ${options.token}`);

  const response = await fetch(`${aiGatewayUrl}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const data = await response.text();
    throw new Error(data || `AI 网关请求失败：${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function validateAiSession(token: string): Promise<AiSession> {
  return requestJson<AiSession>("/api/session", {
    method: "POST",
    token,
    body: JSON.stringify({}),
  });
}

export async function fetchAiNpcs(token: string): Promise<AiNpcSummary[]> {
  const data = await requestJson<{ npcs: AiNpcSummary[] }>("/api/npcs", {
    method: "GET",
    token,
  });
  return data.npcs;
}

export async function fetchAiChatHistory(token: string, npcId: string): Promise<AiChatMessage[]> {
  const data = await requestJson<{ messages: GatewayChatMessage[] }>(`/api/chat/history?npcId=${encodeURIComponent(npcId)}`, {
    method: "GET",
    token,
  });
  return data.messages
    .filter((message): message is GatewayChatMessage & { role: AiChatMessage["role"] } =>
      isUiChatRole(message.role)
    )
    .map((message, index) => ({
      id: `${message.timestamp || "history"}-${index}-${message.role}`,
      role: message.role,
      content: message.content,
      createdAt: message.timestamp,
    }));
}

export async function sendAiNpcMessage(token: string, npcId: string, message: string): Promise<AiChatMessage> {
  const data = await requestJson<{ content: string }>("/api/chat", {
    method: "POST",
    token,
    body: JSON.stringify({ npcId, message }),
  });
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: data.content,
    createdAt: new Date().toISOString(),
  };
}

export async function deleteAiChatHistory(token: string, npcId: string): Promise<void> {
  await requestJson<{ ok: boolean }>("/api/chat/history", {
    method: "DELETE",
    token,
    body: JSON.stringify({ npcId }),
  });
}

export async function fetchModuleClues(token: string, moduleId: string): Promise<ModuleClueReviewPayload> {
  return requestJson<ModuleClueReviewPayload>(`/api/module-clues/${encodeURIComponent(moduleId)}`, {
    method: "GET",
    token,
  });
}

export async function updateModuleClueVisibility(
  token: string,
  moduleId: string,
  clueId: string,
  playerIds: string[],
): Promise<void> {
  await requestJson<{ ok: boolean }>(
    `/api/module-clues/${encodeURIComponent(moduleId)}/visibility/${encodeURIComponent(clueId)}`,
    {
      method: "PUT",
      token,
      body: JSON.stringify({ playerIds }),
    },
  );
}
