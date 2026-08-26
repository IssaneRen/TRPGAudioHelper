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
