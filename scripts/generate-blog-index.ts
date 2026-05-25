import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import matter from "gray-matter";

const POSTS_DIR = "public/blog/posts";
const OUTPUT_FILE = "public/blog/index.json";

const files = readdirSync(POSTS_DIR)
  .filter((f) => f.endsWith(".md"))
  .map((f) => join(POSTS_DIR, f))
  .sort();

interface BlogPostMeta {
  id: string;
  title: string;
  file: string;
  cover?: string[];
  tags: string[];
  players?: string[];
  createdAt: string;
  updatedAt: string;
}

const posts: BlogPostMeta[] = [];

for (const file of files) {
  const raw = readFileSync(file, "utf-8");
  const { data } = matter(raw);

  if (!data.title) {
    console.warn(`⚠️  跳过 ${basename(file)}：缺少 title 字段`);
    continue;
  }

  posts.push({
    id: data.id || basename(file, ".md"),
    title: data.title,
    file: `posts/${basename(file)}`,
    cover: data.cover || undefined,
    tags: data.tags || [],
    players: data.players || undefined,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || data.createdAt || new Date().toISOString(),
  });
}

posts.sort(
  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
);

writeFileSync(OUTPUT_FILE, JSON.stringify(posts, null, 2) + "\n");
console.log(`✅ 生成 ${OUTPUT_FILE}，共 ${posts.length} 篇文章`);
