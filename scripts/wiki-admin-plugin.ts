import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import type { WikiEntryRecord } from "../src/types/wiki";
import { generateWikiIndex, writeWikiEntryRecord } from "./wiki-data";

const SAVE_WIKI_ENTRY_ROUTE = "/__wiki-admin/save-entry";

function sendJson(response: ServerResponse, statusCode: number, payload: unknown) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function readRequestBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    request.on("error", reject);
  });
}

function validateEntryPayload(entry: Partial<WikiEntryRecord>): asserts entry is WikiEntryRecord {
  if (!entry.id?.trim()) throw new Error("词条 id 不能为空");
  if (!entry.category) throw new Error("词条 category 不能为空");
  if (!entry.displayName?.trim()) throw new Error("词条展示名不能为空");
  if (!entry.summary?.trim()) throw new Error("词条摘要不能为空");
  if (!Array.isArray(entry.content)) throw new Error("词条 content 必须为数组");
  if (!entry.createdAt?.trim()) throw new Error("createdAt 不能为空");
  if (!entry.updatedAt?.trim()) throw new Error("updatedAt 不能为空");
}

export function createWikiAdminPlugin(): Plugin {
  let saveInProgress = false;

  return {
    name: "wiki-admin-plugin",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url !== SAVE_WIKI_ENTRY_ROUTE) {
          next();
          return;
        }

        if (request.method !== "POST") {
          sendJson(response, 405, { ok: false, message: "Method Not Allowed" });
          return;
        }

        if (saveInProgress) {
          sendJson(response, 409, { ok: false, message: "已有词条保存任务在进行中，请稍后重试。" });
          return;
        }

        try {
          saveInProgress = true;
          const rawBody = await readRequestBody(request);
          const parsed = JSON.parse(rawBody) as Partial<WikiEntryRecord>;
          validateEntryPayload(parsed);

          writeWikiEntryRecord(parsed);
          const { payload } = generateWikiIndex();

          sendJson(response, 200, {
            ok: true,
            message: `词条 ${parsed.id} 保存成功`,
            index: payload,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "保存词条时发生未知错误";
          sendJson(response, 400, { ok: false, message });
        } finally {
          saveInProgress = false;
        }
      });
    },
  };
}
