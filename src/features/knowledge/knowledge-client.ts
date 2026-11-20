import { loadAiGatewayUrl } from "@/features/ai/ai-gateway-client";

// 左边是接口用的文章类别，右边是维护者在下拉框和列表里看到的中文。
export const documentKinds = {
  module: "模组", setting: "设定", scene: "场景", clue: "线索", character: "人物", location: "地点", event: "事件",
};

export type DocumentKind = keyof typeof documentKinds;
export type World = { id: string; name: string };
export type DocumentInput = { title: string; kind: DocumentKind; body: string; source: string; wikiId: string; revision?: number };
export type KnowledgeDocument = DocumentInput & { id: string; revision: number; updatedAt: string };
export type DocumentSummary = Omit<KnowledgeDocument, "body" | "source">;
export type Relation = { id: string; sourceId: string; targetId: string; label: string };
export type Graph = { nodes: Array<DocumentSummary & { chunkCount: number }>; edges: Relation[] };
// 一条命中对应一段正文。文章编号和修订号用来定位出处，chunkId 用于标识本次索引中的片段。
export type Hit = { chunkId: number; documentId: string; title: string; kind: DocumentKind; revision: number; source: string; wikiId: string; heading: string; excerpt: string };
export type AgentToken = { id: string; label: string; scope: "read" | "write" };
// 公开稿只包含游客要看到的作品字段。私人出处、Wiki 绑定和文章关系从原稿单独读取。
export type PublicationInput = { title: string; summary: string; body: string; coverUrl: string };
export type Publication = PublicationInput & { id: string; updatedAt: string };
export type WorldExport = { world: World; documents: KnowledgeDocument[]; relations: Relation[]; version: 1 };

export function knowledgeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "操作暂时无法完成。";
}

export class KnowledgeRequestError extends Error {
  // 保留 HTTP 状态码，编辑器可用 409 区分版本冲突与普通请求失败。
  constructor(message: string, public readonly status: number) { super(message); }
}

export function knowledgeClient(token: string) {
  // 页面通过这里统一请求 Gateway。凭据放在请求头，私人响应要求浏览器跳过缓存。
  async function request<T>(path = "", method = "GET", data?: unknown): Promise<T> {
    const headers = new Headers({ authorization: `Bearer ${token}` });
    if (data !== undefined) headers.set("content-type", "application/json");
    const response = await fetch(`${await loadAiGatewayUrl()}/api/knowledge/worlds${path}`, {
      method, headers, body: data === undefined ? undefined : JSON.stringify(data), cache: "no-store",
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      throw new KnowledgeRequestError(payload?.error ?? "知识库暂时无法访问。", response.status);
    }
    return response.json() as Promise<T>;
  }
  // 除维护者的世界观目录外，每个地址都要带世界观编号，和后端的权限范围对应。
  return {
    listWorlds: () => request<World[]>(),
    createWorld: (name: string) => request<World>("", "POST", { name }),
    importWorld: (name: string, backup: WorldExport) => request<World>("/import", "POST", { name, backup }),
    graph: (world: string) => request<Graph>(`/${world}/graph`),
    read: (world: string, id: string) => request<KnowledgeDocument>(`/${world}/documents/${id}`),
    save: (world: string, data: DocumentInput, id?: string) => id
      ? request<KnowledgeDocument>(`/${world}/documents/${id}`, "PUT", data)
      : request<KnowledgeDocument>(`/${world}/documents`, "POST", data),
    search: (world: string, query: string) => request<Hit[]>(`/${world}/search`, "POST", { query }),
    addRelation: (world: string, data: Omit<Relation, "id">) => request<Relation>(`/${world}/relations`, "POST", data),
    removeRelation: (world: string, id: string) => request(`/${world}/relations/${id}`, "DELETE"),
    listTokens: (world: string) => request<AgentToken[]>(`/${world}/tokens`),
    createToken: (world: string, label: string, scope: AgentToken["scope"]) => request<AgentToken & { token: string }>(`/${world}/tokens`, "POST", { label, scope }),
    revokeToken: (world: string, id: string) => request(`/${world}/tokens/${id}`, "DELETE"),
    exportWorld: (world: string) => request<WorldExport>(`/${world}/export`),
    publication: (world: string, id: string) => request<Publication | null>(`/${world}/documents/${id}/publication`),
    // 提交时带上预览所对应的原稿修订号，以及上次读到的公开版时间。首次发布的时间值是 null。
    publish: (world: string, id: string, data: PublicationInput & { revision: number; previousPublicationAt: string | null }) =>
      request<Publication>(`/${world}/documents/${id}/publication`, "PUT", data),
    withdraw: (world: string, id: string, previousPublicationAt: string) =>
      request(`/${world}/documents/${id}/publication`, "DELETE", { previousPublicationAt }),
  };
}

export type KnowledgeClient = ReturnType<typeof knowledgeClient>;
