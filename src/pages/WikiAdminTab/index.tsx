import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, BookCopy, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { WikiContentRenderer } from "@/features/wiki/WikiContentRenderer";
import type {
  WikiBlock,
  WikiCategory,
  WikiEntryRecord,
  WikiIndexEntry,
  WikiIndexPayload,
} from "@/types/wiki";

const WIKI_HOME_ROUTE = "/tools/world-wiki";
const WIKI_ADMIN_SAVE_ROUTE = "/__wiki-admin/save-entry";
const CATEGORY_OPTIONS: WikiCategory[] = ["character", "location", "event", "module"];
const CATEGORY_LABELS: Record<WikiCategory, string> = {
  character: "人物",
  location: "地点",
  event: "事件",
  module: "模组",
};

function createBlankEntryRecord(): WikiEntryRecord {
  const now = new Date().toISOString();
  return {
    id: "",
    category: "character",
    displayName: "",
    summary: "",
    aliasNames: [],
    playerIds: [],
    moduleIds: [],
    relatedEntryIds: [],
    facts: [],
    content: [],
    createdAt: now,
    updatedAt: now,
  };
}

function parseDelimitedList(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDelimitedList(values: string[] | undefined): string {
  return (values || []).join("\n");
}

function toggleArrayValue(values: string[] | undefined, target: string): string[] {
  const current = new Set(values || []);
  if (current.has(target)) current.delete(target);
  else current.add(target);
  return Array.from(current);
}

/** 内容编辑区以 JSON 文本为准，保存前统一在这里做解析与报错。 */
function parseContentText(contentText: string): { blocks: WikiBlock[] | null; error: string | null } {
  try {
    const parsed = JSON.parse(contentText || "[]") as WikiBlock[];
    if (!Array.isArray(parsed)) {
      return { blocks: null, error: "content 必须是 JSON 数组。" };
    }
    return { blocks: parsed, error: null };
  } catch (error) {
    return {
      blocks: null,
      error: error instanceof Error ? error.message : "content JSON 解析失败。",
    };
  }
}

/** 通过按钮向 content 追加合法模板，减少手写嵌套 JSON 的负担。 */
function appendSnippetToContent(contentText: string, snippet: WikiBlock): string {
  const parsed = parseContentText(contentText);
  const nextBlocks = [...(parsed.blocks || []), snippet];
  return JSON.stringify(nextBlocks, null, 2);
}

function buildRefParagraph(entry: WikiIndexEntry): WikiBlock {
  return {
    type: "paragraph",
    tokens: [
      { type: "text", text: "这里可以插入到 " },
      { type: "ref", entryId: entry.id, label: entry.displayName },
      { type: "text", text: " 的引用说明。" },
    ],
  };
}

function buildSecretInlineParagraph(playerIds: string[]): WikiBlock {
  return {
    type: "paragraph",
    tokens: [
      { type: "text", text: "公开部分描述，随后补一段 " },
      {
        type: "secret-inline",
        playerIds,
        text: "只有选中 PL 能看到的句子级补遗",
      },
      { type: "text", text: "，方便快速搭建权限内容。" },
    ],
  };
}

function SelectionGroup({
  title,
  values,
  options,
  onToggle,
}: {
  title: string;
  values: string[] | undefined;
  options: Array<{ id: string; label: string }>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = (values || []).includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggle(option.id)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/70 text-muted-foreground hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function WikiAdminTab() {
  const [indexData, setIndexData] = useState<WikiIndexPayload | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, WikiEntryRecord>>({});
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [draft, setDraft] = useState<WikiEntryRecord | null>(null);
  const [contentText, setContentText] = useState("[]");
  const [selectedHelperEntryId, setSelectedHelperEntryId] = useState<string>("");
  const [selectedHelperPlayerId, setSelectedHelperPlayerId] = useState<string>("");
  const [indexLoading, setIndexLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIndexLoading(true);

    fetch("/wiki/index.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load wiki index: ${response.status}`);
        return response.json();
      })
      .then((data: WikiIndexPayload) => {
        if (cancelled) return;
        setIndexData(data);
        setSelectedHelperEntryId(data.entries[0]?.id || "");
        setSelectedHelperPlayerId(data.players[0]?.id || "");
        setSelectedEntryId((current) => current || data.entries[0]?.id || null);
      })
      .catch(() => {
        if (!cancelled) toast.error("Wiki 管理页加载索引失败，请刷新重试。");
      })
      .finally(() => {
        if (!cancelled) setIndexLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedEntryId) return;
    if (detailCache[selectedEntryId]) {
      setDraft(detailCache[selectedEntryId]);
      setContentText(JSON.stringify(detailCache[selectedEntryId].content, null, 2));
      return;
    }

    let cancelled = false;
    setDetailLoading(true);

    fetch(`/wiki/entities/entries/${selectedEntryId}.json`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load wiki entry: ${response.status}`);
        return response.json();
      })
      .then((data: WikiEntryRecord) => {
        if (cancelled) return;
        setDetailCache((current) => ({ ...current, [data.id]: data }));
        setDraft(data);
        setContentText(JSON.stringify(data.content, null, 2));
      })
      .catch(() => {
        if (!cancelled) toast.error(`词条 ${selectedEntryId} 加载失败。`);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [detailCache, selectedEntryId]);

  const parsedContent = useMemo(() => parseContentText(contentText), [contentText]);
  const entriesById = useMemo(
    () => new Map((indexData?.entries || []).map((entry) => [entry.id, entry])),
    [indexData]
  );
  const playerOptions = useMemo(
    () => (indexData?.players || []).map((player) => ({ id: player.id, label: player.displayName })),
    [indexData]
  );
  const moduleOptions = useMemo(
    () => (indexData?.modules || []).map((module) => ({ id: module.id, label: module.displayName })),
    [indexData]
  );
  const entryOptions = useMemo(
    () => (indexData?.entries || []).map((entry) => ({ id: entry.id, label: entry.displayName })),
    [indexData]
  );
  const selectedHelperEntry = useMemo(
    () => indexData?.entries.find((entry) => entry.id === selectedHelperEntryId) ?? null,
    [indexData, selectedHelperEntryId]
  );

  const patchDraft = useCallback((patch: Partial<WikiEntryRecord>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const handleCreateDraft = useCallback(() => {
    const blank = createBlankEntryRecord();
    setSelectedEntryId(null);
    setDraft(blank);
    setContentText(JSON.stringify(blank.content, null, 2));
  }, []);

  const handleSave = useCallback(async () => {
    if (!draft) return;
    if (parsedContent.error || !parsedContent.blocks) {
      toast.error("请先修复 content JSON 的格式错误。");
      return;
    }

    const payload: WikiEntryRecord = {
      ...draft,
      aliasNames: draft.aliasNames || [],
      playerIds: draft.playerIds || [],
      moduleIds: draft.moduleIds || [],
      relatedEntryIds: draft.relatedEntryIds || [],
      facts: draft.facts || [],
      content: parsedContent.blocks,
      createdAt: draft.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      setSaveLoading(true);
      const response = await fetch(WIKI_ADMIN_SAVE_ROUTE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        ok: boolean;
        message: string;
        index?: WikiIndexPayload;
      };

      if (!response.ok || !result.ok || !result.index) {
        throw new Error(result.message || "保存失败");
      }

      setIndexData(result.index);
      setDetailCache((current) => ({ ...current, [payload.id]: payload }));
      setDraft(payload);
      setSelectedEntryId(payload.id);
      setContentText(JSON.stringify(payload.content, null, 2));
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "词条保存失败");
    } finally {
      setSaveLoading(false);
    }
  }, [draft, parsedContent.blocks, parsedContent.error]);

  if (indexLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-4">
        <Skeleton className="h-20 rounded-3xl" />
        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <Skeleton className="h-[640px] rounded-3xl" />
          <Skeleton className="h-[640px] rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="eldritch-card rounded-[28px] border border-border/70 bg-card/75 p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Badge variant="outline" className="w-fit border-primary/30 bg-primary/10 text-primary">
              <BookCopy className="h-3.5 w-3.5" />
              DEV ONLY
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-heading font-semibold tracking-wide md:text-4xl">
                世界 Wiki 管理台
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
                这里是仅开发环境存在的内容维护入口。你可以编辑词条元数据、点选关联对象，并通过
                content JSON + 模板辅助快速构造正文与权限片段。
              </p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link to={WIKI_HOME_ROUTE}>
              <ArrowLeft className="h-4 w-4" />
              返回阅读页
            </Link>
          </Button>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <Card className="border-border/70 bg-card/80 py-5">
            <CardHeader className="gap-2">
              <CardTitle className="text-base">词条列表</CardTitle>
              <CardDescription>点击加载已有词条，或新建空白草稿。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" onClick={handleCreateDraft}>
                <Plus className="h-4 w-4" />
                新建词条草稿
              </Button>
              <div className="space-y-2">
                {(indexData?.entries || []).map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setSelectedEntryId(entry.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                      selectedEntryId === entry.id
                        ? "border-primary bg-primary/10"
                        : "border-border/60 bg-background/60 hover:bg-accent/30"
                    }`}
                  >
                    <div className="text-sm font-medium">{entry.displayName}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{entry.id}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>

        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <div className="space-y-6">
            <Card className="border-border/70 bg-card/80 py-5">
              <CardHeader className="gap-2">
                <CardTitle className="text-base">元数据</CardTitle>
                <CardDescription>先维护词条基础信息，再保存正文内容。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {detailLoading && !draft ? (
                  <Skeleton className="h-64 rounded-2xl" />
                ) : draft ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="wiki-admin-id">唯一键</Label>
                        <Input
                          id="wiki-admin-id"
                          value={draft.id}
                          readOnly={Boolean(selectedEntryId)}
                          onChange={(event) => patchDraft({ id: event.target.value.trim() })}
                          placeholder="例如：char.new-entry"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="wiki-admin-category">分类</Label>
                        <select
                          id="wiki-admin-category"
                          value={draft.category}
                          onChange={(event) =>
                            patchDraft({ category: event.target.value as WikiCategory })
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none"
                        >
                          {CATEGORY_OPTIONS.map((category) => (
                            <option key={category} value={category}>
                              {CATEGORY_LABELS[category]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="wiki-admin-display-name">展示名</Label>
                      <Input
                        id="wiki-admin-display-name"
                        value={draft.displayName}
                        onChange={(event) => patchDraft({ displayName: event.target.value })}
                        placeholder="例如：艾伦 Allen"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="wiki-admin-summary">摘要</Label>
                      <Textarea
                        id="wiki-admin-summary"
                        value={draft.summary}
                        onChange={(event) => patchDraft({ summary: event.target.value })}
                        className="min-h-24"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="wiki-admin-aliases">别名（每行一个，可逗号分隔）</Label>
                      <Textarea
                        id="wiki-admin-aliases"
                        value={formatDelimitedList(draft.aliasNames)}
                        onChange={(event) =>
                          patchDraft({ aliasNames: parseDelimitedList(event.target.value) })
                        }
                        className="min-h-24"
                      />
                    </div>

                    <SelectionGroup
                      title="关联 PL"
                      values={draft.playerIds}
                      options={playerOptions}
                      onToggle={(id) => patchDraft({ playerIds: toggleArrayValue(draft.playerIds, id) })}
                    />

                    <SelectionGroup
                      title="所属模组"
                      values={draft.moduleIds}
                      options={moduleOptions}
                      onToggle={(id) => patchDraft({ moduleIds: toggleArrayValue(draft.moduleIds, id) })}
                    />

                    <SelectionGroup
                      title="关联词条"
                      values={draft.relatedEntryIds}
                      options={entryOptions.filter((entry) => entry.id !== draft.id)}
                      onToggle={(id) =>
                        patchDraft({
                          relatedEntryIds: toggleArrayValue(draft.relatedEntryIds, id),
                        })
                      }
                    />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>信息框 facts</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            patchDraft({
                              facts: [...(draft.facts || []), { label: "新字段", value: "待填写" }],
                            })
                          }
                        >
                          <Plus className="h-4 w-4" />
                          添加字段
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {(draft.facts || []).map((fact, index) => (
                          <div key={`${fact.label}-${index}`} className="grid gap-2 md:grid-cols-[160px_minmax(0,1fr)_72px]">
                            <Input
                              value={fact.label}
                              onChange={(event) =>
                                patchDraft({
                                  facts: (draft.facts || []).map((item, itemIndex) =>
                                    itemIndex === index
                                      ? { ...item, label: event.target.value }
                                      : item
                                  ),
                                })
                              }
                              placeholder="字段名"
                            />
                            <Input
                              value={fact.value}
                              onChange={(event) =>
                                patchDraft({
                                  facts: (draft.facts || []).map((item, itemIndex) =>
                                    itemIndex === index
                                      ? { ...item, value: event.target.value }
                                      : item
                                  ),
                                })
                              }
                              placeholder="字段值"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                patchDraft({
                                  facts: (draft.facts || []).filter((_, itemIndex) => itemIndex !== index),
                                })
                              }
                            >
                              删除
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">请选择左侧词条或新建草稿。</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/80 py-5">
              <CardHeader className="gap-2">
                <CardTitle className="text-base">正文 content JSON</CardTitle>
                <CardDescription>Phase 2a 先走 JSON + 模板助手，后续再补块级可视化编辑。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setContentText(
                        appendSnippetToContent(contentText, { type: "heading", text: "新标题" })
                      )
                    }
                  >
                    标题模板
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setContentText(
                        appendSnippetToContent(contentText, {
                          type: "paragraph",
                          tokens: [{ type: "text", text: "这里填写一段公开正文。" }],
                        })
                      )
                    }
                  >
                    段落模板
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setContentText(
                        appendSnippetToContent(contentText, {
                          type: "list",
                          items: [[{ type: "text", text: "列表项 1" }]],
                        })
                      )
                    }
                  >
                    列表模板
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setContentText(
                        appendSnippetToContent(contentText, {
                          type: "quote",
                          tokens: [{ type: "text", text: "这里填写一段引用内容。" }],
                        })
                      )
                    }
                  >
                    引述模板
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setContentText(
                        appendSnippetToContent(contentText, {
                          type: "secret-panel",
                          title: "未命名隐藏档案",
                          playerIds: [],
                          blocks: [
                            {
                              type: "paragraph",
                              tokens: [{ type: "text", text: "这里填写整段隐藏内容。" }],
                            },
                          ],
                        })
                      )
                    }
                  >
                    隐藏块模板
                  </Button>
                </div>

                <Textarea
                  value={contentText}
                  onChange={(event) => setContentText(event.target.value)}
                  className="min-h-[340px] font-mono text-sm"
                />

                {parsedContent.error && (
                  <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    content JSON 解析失败：{parsedContent.error}
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <Button type="button" onClick={handleSave} disabled={saveLoading || !draft}>
                    <Save className="h-4 w-4" />
                    {saveLoading ? "保存中..." : "保存词条"}
                  </Button>
                  {draft?.id && (
                    <Button variant="outline" asChild>
                      <Link to={`${WIKI_HOME_ROUTE}/${draft.id}`}>打开当前阅读页</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-border/70 bg-card/80 py-5">
              <CardHeader className="gap-2">
                <CardTitle className="text-base">点选辅助</CardTitle>
                <CardDescription>通过现有词条 / PL 快速追加合法模板，减少手写 id。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wiki-helper-entry">引用目标词条</Label>
                  <select
                    id="wiki-helper-entry"
                    value={selectedHelperEntryId}
                    onChange={(event) => setSelectedHelperEntryId(event.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none"
                  >
                    {(indexData?.entries || []).map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.displayName}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!selectedHelperEntry}
                    onClick={() => {
                      if (!selectedHelperEntry) return;
                      setContentText(
                        appendSnippetToContent(contentText, buildRefParagraph(selectedHelperEntry))
                      );
                    }}
                  >
                    追加引用段落
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wiki-helper-player">权限示例 PL</Label>
                  <select
                    id="wiki-helper-player"
                    value={selectedHelperPlayerId}
                    onChange={(event) => setSelectedHelperPlayerId(event.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none"
                  >
                    {(indexData?.players || []).map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.displayName}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!selectedHelperPlayerId}
                    onClick={() =>
                      setContentText(
                        appendSnippetToContent(contentText, buildSecretInlineParagraph([selectedHelperPlayerId]))
                      )
                    }
                  >
                    追加句子级权限模板
                  </Button>
                </div>

                <div className="rounded-xl border border-border/60 bg-background/60 p-4 text-sm leading-7 text-muted-foreground">
                  建议工作流：先维护元数据，再用按钮生成合法 block 模板，最后在 JSON 区做少量微调并保存。
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/80 py-5">
              <CardHeader className="gap-2">
                <CardTitle className="text-base">实时预览</CardTitle>
                <CardDescription>编辑态默认强制展示所有 secret 内容，方便作者检查结构。</CardDescription>
              </CardHeader>
              <CardContent>
                {draft && parsedContent.blocks ? (
                  <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
                    <WikiContentRenderer
                      blocks={parsedContent.blocks}
                      currentPlayerId={null}
                      entriesById={entriesById}
                      revealAllSecrets
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {parsedContent.error
                      ? "请先修复 content JSON，再查看预览。"
                      : "当前还没有可预览的词条内容。"}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
