import type { BlogPostDocument } from "@/features/content-admin/content-admin-client";
import type { WikiEntryRecord } from "@/types/wiki";

export function parseDelimitedList(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

export function formatDelimitedList(values: string[] | undefined): string {
  return (values ?? []).join("\n");
}

export function createBlankBlog(now = new Date().toISOString()): BlogPostDocument {
  return {
    id: "",
    title: "",
    tags: [],
    renderMode: "markdown",
    createdAt: now,
    updatedAt: now,
    markdown: ""
  };
}

/** 从标题推导博客 id（网关要求 [a-z0-9][a-z0-9._-]*），中文标题会得到空串。 */
export function slugifyBlogTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");
}

export function createBlankWiki(now = new Date().toISOString()): WikiEntryRecord {
  return {
    id: "",
    category: "character",
    displayName: "",
    summary: "",
    aliasNames: [],
    playerIds: [],
    moduleIds: [],
    relatedEntryIds: [],
    relatedEntryAccess: [],
    facts: [],
    tags: [],
    content: [],
    createdAt: now,
    updatedAt: now
  };
}
