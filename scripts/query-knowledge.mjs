import { readFile } from "node:fs/promises";

const configPath = process.env.KNOWLEDGE_READ_CONFIG
  ?? new URL("../trpg-ai-gateway/.local/knowledge-runtime/read-client.json", import.meta.url);

async function query() {
  const [worldName, keyword] = process.argv.slice(2);
  if (!worldName || (!keyword && worldName !== "--worlds")) {
    throw new Error("用法：node scripts/query-knowledge.mjs <世界观> <关键词>，或使用 --worlds 查看已配置的世界观。");
  }

  let config;
  try {
    config = JSON.parse(await readFile(configPath, "utf8"));
  } catch {
    throw new Error("读取世界观凭据配置失败。请检查知识库只读配置是否存在。");
  }
  const worlds = config?.worlds;
  if (!worlds || typeof worlds !== "object" || Array.isArray(worlds)) {
    throw new Error("知识库只读配置缺少世界观列表。");
  }
  if (worldName === "--worlds") return Object.keys(worlds);

  const world = Object.hasOwn(worlds, worldName) ? worlds[worldName] : undefined;
  if (!world || !/^[a-f0-9]{32}$/.test(world.id) || !/^rag_[a-f0-9]{64}$/.test(world.token)) {
    throw new Error("没有此世界观的只读配置。使用 --worlds 查看可选世界观。");
  }
  const host = new URL(config.baseUrl);
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(host.hostname);
  if (host.protocol !== "https:" && !(host.protocol === "http:" && loopback)) {
    throw new Error("远端知识库地址须使用 HTTPS。");
  }

  // 每次请求只访问指定世界观，凭据从本机私有配置读入。
  const url = new URL(`/api/knowledge/worlds/${world.id}/search`, host);
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${world.token}`, "content-type": "application/json" },
      body: JSON.stringify({ query: keyword, limit: 8 }),
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new Error("连接知识库失败。请检查后端是否正在运行。");
  }
  if (!response.ok) throw new Error(`检索失败（${response.status}）。请检查关键词、凭据和后端状态。`);
  return { world: worldName, query: keyword, hits: await response.json() };
}

try {
  console.log(JSON.stringify(await query(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : "检索失败。");
  process.exitCode = 1;
}
