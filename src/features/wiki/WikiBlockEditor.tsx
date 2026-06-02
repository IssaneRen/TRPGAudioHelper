import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  WikiBlock,
  WikiIndexEntry,
  WikiInlineToken,
  WikiPlayer,
} from "@/types/wiki";

type BlockType = WikiBlock["type"];
type TokenType = WikiInlineToken["type"];

interface OptionItem {
  id: string;
  label: string;
}

interface WikiBlockEditorProps {
  blocks: WikiBlock[];
  entries: WikiIndexEntry[];
  players: WikiPlayer[];
  onChange: (nextBlocks: WikiBlock[]) => void;
}

function updateArrayItem<T>(items: T[], index: number, nextItem: T): T[] {
  return items.map((item, itemIndex) => (itemIndex === index ? nextItem : item));
}

function removeArrayItem<T>(items: T[], index: number): T[] {
  return items.filter((_, itemIndex) => itemIndex !== index);
}

function moveArrayItem<T>(items: T[], index: number, offset: -1 | 1): T[] {
  const nextIndex = index + offset;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const nextItems = [...items];
  [nextItems[index], nextItems[nextIndex]] = [nextItems[nextIndex], nextItems[index]];
  return nextItems;
}

function createDefaultToken(type: TokenType, entries: WikiIndexEntry[], players: WikiPlayer[]): WikiInlineToken {
  if (type === "ref") {
    return {
      type: "ref",
      entryId: entries[0]?.id || "",
      label: entries[0]?.displayName || "请选择引用词条",
    };
  }

  if (type === "secret-inline") {
    return {
      type: "secret-inline",
      text: "只有指定 PL 可见的句子级内容",
      playerIds: players[0] ? [players[0].id] : [],
    };
  }

  return {
    type: "text",
    text: "公开文本",
  };
}

function createDefaultBlock(type: BlockType, entries: WikiIndexEntry[], players: WikiPlayer[]): WikiBlock {
  if (type === "heading") {
    return { type: "heading", text: "新标题" };
  }

  if (type === "image") {
    return {
      type: "image",
      src: "/wiki/images/placeholder.png",
      alt: "图片",
      caption: "图片说明（可选）",
    };
  }

  if (type === "list") {
    return {
      type: "list",
      items: [[createDefaultToken("text", entries, players)]],
    };
  }

  if (type === "quote") {
    return {
      type: "quote",
      tokens: [createDefaultToken("text", entries, players)],
    };
  }

  if (type === "secret-panel") {
    return {
      type: "secret-panel",
      title: "未命名隐藏档案",
      hiddenMode: "mask",
      playerIds: players[0] ? [players[0].id] : [],
      blocks: [
        {
          type: "paragraph",
          tokens: [createDefaultToken("text", entries, players)],
        },
      ],
    };
  }

  if (type === "coc-sheet") {
    return {
      type: "coc-sheet",
      cocData: {
        avatar: "pic/xxx.png",
        attributes: {
          str: 55,
          con: 60,
          siz: 65,
          dex: 70,
          int: 80,
          pow: 60,
          app: 50,
          edu: 75,
          hp: 12,
          maxHp: 12,
          mp: 12,
          maxMp: 12,
          san: 60,
          maxSan: 60,
          luck: 60,
          mov: 8,
          build: "0",
        },
        skills: {
          侦查: { base: 50, growth: 10, changes: [{ delta: 10, reason: "示例成长", at: "1928-11-09" }] },
          聆听: { base: 40 },
        },
      },
    };
  }

  return {
    type: "paragraph",
    tokens: [createDefaultToken("text", entries, players)],
  };
}

function SelectionChips({
  title,
  values,
  options,
  onToggle,
}: {
  title: string;
  values: string[] | undefined;
  options: OptionItem[];
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

function TokenEditor({
  token,
  tokenIndex,
  tokens,
  entries,
  players,
  onChange,
}: {
  token: WikiInlineToken;
  tokenIndex: number;
  tokens: WikiInlineToken[];
  entries: WikiIndexEntry[];
  players: WikiPlayer[];
  onChange: (nextTokens: WikiInlineToken[]) => void;
}) {
  const entryOptions = entries.map((entry) => ({ id: entry.id, label: entry.displayName }));
  const playerOptions = players.map((player) => ({ id: player.id, label: player.displayName }));

  /** token 类型变化时重建合法默认结构，避免遗留旧字段污染。 */
  function handleTokenTypeChange(nextType: TokenType) {
    onChange(updateArrayItem(tokens, tokenIndex, createDefaultToken(nextType, entries, players)));
  }

  function patchToken(patch: Partial<WikiInlineToken>) {
    onChange(updateArrayItem(tokens, tokenIndex, { ...token, ...patch }));
  }

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-background/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <select
            value={token.type}
            onChange={(event) => handleTokenTypeChange(event.target.value as TokenType)}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none"
          >
            <option value="text">text</option>
            <option value="ref">ref</option>
            <option value="secret-inline">secret-inline</option>
          </select>
          <span className="text-xs text-muted-foreground">Token {tokenIndex + 1}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={tokenIndex === 0}
            onClick={() => onChange(moveArrayItem(tokens, tokenIndex, -1))}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={tokenIndex === tokens.length - 1}
            onClick={() => onChange(moveArrayItem(tokens, tokenIndex, 1))}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() =>
              onChange([...tokens.slice(0, tokenIndex + 1), token, ...tokens.slice(tokenIndex + 1)])
            }
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onChange(removeArrayItem(tokens, tokenIndex))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {token.type === "text" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>公开文本</Label>
            <Textarea
              value={token.text || ""}
              onChange={(event) => patchToken({ text: event.target.value })}
              className="min-h-20"
            />
          </div>
          <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border/50 bg-background/60 p-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={token.bold || false}
                onChange={(event) => patchToken({ bold: event.target.checked || undefined })}
              />
              加粗
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={token.strikethrough || false}
                onChange={(event) => patchToken({ strikethrough: event.target.checked || undefined })}
              />
              删除线
            </label>
            <label className="space-y-1 text-sm">
              <span className="block text-xs text-muted-foreground">文字颜色</span>
              <input
                type="color"
                value={token.color || "#6b4fbb"}
                onChange={(event) => patchToken({ color: event.target.value })}
                className="h-9 w-14 cursor-pointer rounded border border-input bg-transparent p-1"
              />
            </label>
            {token.color && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => patchToken({ color: undefined })}
              >
                清除颜色
              </Button>
            )}
          </div>
        </div>
      )}

      {token.type === "ref" && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>引用词条</Label>
            <select
              value={token.entryId || ""}
              onChange={(event) => {
                const matched = entries.find((entry) => entry.id === event.target.value);
                patchToken({
                  entryId: event.target.value,
                  label: matched?.displayName || token.label,
                });
              }}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none"
            >
              {entryOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>显示文案</Label>
            <Input
              value={token.label || ""}
              onChange={(event) => patchToken({ label: event.target.value })}
              placeholder="引用时展示的文本"
            />
          </div>
        </div>
      )}

      {token.type === "secret-inline" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>隐藏文本</Label>
            <Textarea
              value={token.text || ""}
              onChange={(event) => patchToken({ text: event.target.value })}
              className="min-h-20"
            />
          </div>
          <SelectionChips
            title="可见 PL"
            values={token.playerIds}
            options={playerOptions}
            onToggle={(playerId) =>
              patchToken({
                playerIds: (token.playerIds || []).includes(playerId)
                  ? (token.playerIds || []).filter((id) => id !== playerId)
                  : [...(token.playerIds || []), playerId],
              })
            }
          />
        </div>
      )}
    </div>
  );
}

function TokenListEditor({
  tokens,
  entries,
  players,
  onChange,
}: {
  tokens: WikiInlineToken[];
  entries: WikiIndexEntry[];
  players: WikiPlayer[];
  onChange: (nextTokens: WikiInlineToken[]) => void;
}) {
  return (
    <div className="space-y-3">
      {tokens.map((token, tokenIndex) => (
        <TokenEditor
          key={`token-${tokenIndex}`}
          token={token}
          tokenIndex={tokenIndex}
          tokens={tokens}
          entries={entries}
          players={players}
          onChange={onChange}
        />
      ))}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...tokens, createDefaultToken("text", entries, players)])}
        >
          <Plus className="h-4 w-4" />
          添加 text
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...tokens, createDefaultToken("ref", entries, players)])}
        >
          <Plus className="h-4 w-4" />
          添加 ref
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([...tokens, createDefaultToken("secret-inline", entries, players)])
          }
        >
          <Plus className="h-4 w-4" />
          添加 secret-inline
        </Button>
      </div>
    </div>
  );
}

function BlockEditorCard({
  block,
  blockIndex,
  blocks,
  entries,
  players,
  onChange,
}: {
  block: WikiBlock;
  blockIndex: number;
  blocks: WikiBlock[];
  entries: WikiIndexEntry[];
  players: WikiPlayer[];
  onChange: (nextBlocks: WikiBlock[]) => void;
}) {
  const playerOptions = players.map((player) => ({ id: player.id, label: player.displayName }));

  /** 每次 block 类型切换时都重建默认数据模型，避免旧字段残留导致 schema 混乱。 */
  function handleBlockTypeChange(nextType: BlockType) {
    onChange(updateArrayItem(blocks, blockIndex, createDefaultBlock(nextType, entries, players)));
  }

  function patchBlock(patch: Partial<WikiBlock>) {
    onChange(updateArrayItem(blocks, blockIndex, { ...block, ...patch }));
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-background/45 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <select
            value={block.type}
            onChange={(event) => handleBlockTypeChange(event.target.value as BlockType)}
            className="flex h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none"
          >
            <option value="heading">heading</option>
            <option value="paragraph">paragraph</option>
            <option value="list">list</option>
            <option value="quote">quote</option>
            <option value="image">image</option>
            <option value="secret-panel">secret-panel</option>
            <option value="coc-sheet">coc-sheet</option>
          </select>
          <span className="text-sm text-muted-foreground">Block {blockIndex + 1}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={blockIndex === 0}
            onClick={() => onChange(moveArrayItem(blocks, blockIndex, -1))}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={blockIndex === blocks.length - 1}
            onClick={() => onChange(moveArrayItem(blocks, blockIndex, 1))}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() =>
              onChange([...blocks.slice(0, blockIndex + 1), block, ...blocks.slice(blockIndex + 1)])
            }
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onChange(removeArrayItem(blocks, blockIndex))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {block.type === "heading" && (
        <div className="space-y-2">
          <Label>标题文本</Label>
          <Input
            value={block.text || ""}
            onChange={(event) => patchBlock({ text: event.target.value })}
            placeholder="章节标题"
          />
        </div>
      )}

      {(block.type === "paragraph" || block.type === "quote") && (
        <TokenListEditor
          tokens={block.tokens || []}
          entries={entries}
          players={players}
          onChange={(nextTokens) => patchBlock({ tokens: nextTokens })}
        />
      )}

      {block.type === "list" && (
        <div className="space-y-3">
          {(block.items || []).map((item, itemIndex, items) => (
            <div key={`list-item-${itemIndex}`} className="space-y-3 rounded-xl border border-border/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">列表项 {itemIndex + 1}</span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={itemIndex === 0}
                    onClick={() =>
                      patchBlock({
                        items: moveArrayItem(items, itemIndex, -1),
                      })
                    }
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={itemIndex === items.length - 1}
                    onClick={() =>
                      patchBlock({
                        items: moveArrayItem(items, itemIndex, 1),
                      })
                    }
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      patchBlock({
                        items: [...items.slice(0, itemIndex + 1), item, ...items.slice(itemIndex + 1)],
                      })
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      patchBlock({
                        items: removeArrayItem(items, itemIndex),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <TokenListEditor
                tokens={item}
                entries={entries}
                players={players}
                onChange={(nextTokens) =>
                  patchBlock({
                    items: updateArrayItem(items, itemIndex, nextTokens),
                  })
                }
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              patchBlock({
                items: [...(block.items || []), [createDefaultToken("text", entries, players)]],
              })
            }
          >
            <Plus className="h-4 w-4" />
            添加列表项
          </Button>
        </div>
      )}

      {block.type === "image" && (
        <div className="space-y-3 rounded-xl border border-border/60 bg-background/60 p-4">
          <div className="space-y-2">
            <Label>图片路径（以 public 为根的绝对路径）</Label>
            <Input
              value={block.src || ""}
              onChange={(event) => patchBlock({ src: event.target.value })}
              placeholder="/wiki/images/xxx.png 或 /blog/images/xxx.png"
            />
          </div>
          <div className="space-y-2">
            <Label>alt（可选）</Label>
            <Input
              value={block.alt || ""}
              onChange={(event) => patchBlock({ alt: event.target.value })}
              placeholder="图片替代文本"
            />
          </div>
          <div className="space-y-2">
            <Label>说明文字（caption，可选）</Label>
            <Input
              value={block.caption || ""}
              onChange={(event) => patchBlock({ caption: event.target.value })}
              placeholder="例如：金斯波特附近地图"
            />
          </div>
        </div>
      )}

      {block.type === "secret-panel" && (
        <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="space-y-2">
            <Label>隐藏块标题</Label>
            <Input
              value={block.title || ""}
              onChange={(event) => patchBlock({ title: event.target.value })}
              placeholder="例如：角色个人视角补遗"
            />
          </div>
          <SelectionChips
            title="可见 PL"
            values={block.playerIds}
            options={playerOptions}
            onToggle={(playerId) =>
              patchBlock({
                playerIds: (block.playerIds || []).includes(playerId)
                  ? (block.playerIds || []).filter((id) => id !== playerId)
                  : [...(block.playerIds || []), playerId],
              })
            }
          />
          <div className="space-y-2">
            <Label>未授权显示方式</Label>
            <select
              value={block.hiddenMode || "mask"}
              onChange={(event) =>
                patchBlock({ hiddenMode: event.target.value as "mask" | "collapse" })
              }
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none"
            >
              <option value="mask">显示黑框遮罩（mask）</option>
              <option value="collapse">完全隐藏内容（collapse）</option>
            </select>
          </div>
          <div className="space-y-3">
            <Label>隐藏块内部内容</Label>
            <WikiBlockEditor
              blocks={block.blocks || []}
              entries={entries}
              players={players}
              onChange={(nextBlocks) => patchBlock({ blocks: nextBlocks })}
            />
          </div>
        </div>
      )}

      {block.type === "coc-sheet" && (
        <div className="space-y-3 rounded-xl border border-border/60 bg-background/60 p-4">
          <div className="space-y-2">
            <Label>头像路径（可选）</Label>
            <Input
              value={block.cocData?.avatar || ""}
              onChange={(event) =>
                patchBlock({
                  cocData: {
                    ...(block.cocData || {}),
                    avatar: event.target.value,
                  },
                })
              }
              placeholder="pic/xxx.png"
            />
          </div>
          <div className="space-y-2">
            <Label>属性 JSON（attributes）</Label>
            <Textarea
              value={JSON.stringify(block.cocData?.attributes || block.cocData?.status || {}, null, 2)}
              onChange={(event) => {
                try {
                  const attributes = JSON.parse(event.target.value) as NonNullable<
                    NonNullable<typeof block.cocData>["attributes"]
                  >;
                  patchBlock({ cocData: { ...(block.cocData || {}), attributes } });
                } catch {
                  // ignore temporary invalid json while typing
                }
              }}
              className="min-h-32 font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label>技能 JSON（skills：含 base / growth / changes）</Label>
            <Textarea
              value={JSON.stringify(block.cocData?.skills || block.cocData?.skill || {}, null, 2)}
              onChange={(event) => {
                try {
                  const skills = JSON.parse(event.target.value) as NonNullable<
                    NonNullable<typeof block.cocData>["skills"]
                  >;
                  patchBlock({ cocData: { ...(block.cocData || {}), skills } });
                } catch {
                  // ignore temporary invalid json while typing
                }
              }}
              className="min-h-32 font-mono text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function WikiBlockEditor({
  blocks,
  entries,
  players,
  onChange,
}: WikiBlockEditorProps) {
  return (
    <div className="space-y-4">
      {blocks.map((block, blockIndex) => (
        <BlockEditorCard
          key={`block-${blockIndex}`}
          block={block}
          blockIndex={blockIndex}
          blocks={blocks}
          entries={entries}
          players={players}
          onChange={onChange}
        />
      ))}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...blocks, createDefaultBlock("heading", entries, players)])}
        >
          <Plus className="h-4 w-4" />
          添加标题
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...blocks, createDefaultBlock("paragraph", entries, players)])}
        >
          <Plus className="h-4 w-4" />
          添加段落
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...blocks, createDefaultBlock("list", entries, players)])}
        >
          <Plus className="h-4 w-4" />
          添加列表
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...blocks, createDefaultBlock("quote", entries, players)])}
        >
          <Plus className="h-4 w-4" />
          添加引述
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...blocks, createDefaultBlock("image", entries, players)])}
        >
          <Plus className="h-4 w-4" />
          添加图片
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...blocks, createDefaultBlock("secret-panel", entries, players)])}
        >
          <Plus className="h-4 w-4" />
          添加隐藏块
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...blocks, createDefaultBlock("coc-sheet", entries, players)])}
        >
          <Plus className="h-4 w-4" />
          添加 COC 人物卡
        </Button>
      </div>
    </div>
  );
}
