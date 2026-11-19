import type { Block, PartialBlock, PartialInlineContent, PartialInlineContentElement } from "@blocknote/core";
import type { CocSheetData, WikiBlock, WikiInlineToken } from "@/types/wiki";
import type { WikiBlockNoteSchema } from "@/features/wiki/wiki-blocknote-schema";

/**
 * WikiBlock[]（存储格式，唯一事实源）↔ BlockNote blocks 的双向纯转换。
 *
 * 设计约定（与 wiki-blocknote-schema.tsx 的自定义 spec 一一对应）：
 * - heading → BN heading（level 2）；BN 任意 level 的 heading 回转时丢弃 level
 * - paragraph/quote → 同名默认块；text token 的 bold/strikethrough → bold/strike style，
 *   color(hex) → hexTextColor 自定义 style
 * - list → 展开为连续 bulletListItem；回转时把连续 bullet/numberedListItem 合并回一个
 *   wiki list（BN numberedListItem 无 wiki 对应类型，内容保入 list）
 * - image → BN image（src→url, caption→caption）；wiki alt 无 BN 对应 prop，不保留
 * - secret-panel → 自定义 secretPanel 块（playerIds 以逗号串存 prop），blocks↔children 递归
 * - coc-sheet → 自定义 cocSheet 块，cocData 整体 JSON 序列化进单个 string prop
 * - ref → 自定义 wikiRef 行内（entryId/label）；secret-inline → 自定义 wikiSecret 行内
 *   （text 为 plain content，playerIds 存 prop）
 *
 * 规范化（保证 round-trip 稳定）：空字符串/空数组的可选字段在回转时省略；
 * BN 中非 secretPanel 块的子块回转时拍平为其后的兄弟块（防数据丢失）；
 * BN 独有块（checkListItem/codeBlock/table 等）回转降级为 paragraph（提取纯文本）。
 */

type Schema = WikiBlockNoteSchema;
type SchemaBlock = PartialBlock<
  Schema["blockSchema"],
  Schema["inlineContentSchema"],
  Schema["styleSchema"]
>;
type SchemaReadBlock = Block<
  Schema["blockSchema"],
  Schema["inlineContentSchema"],
  Schema["styleSchema"]
>;

export type { SchemaBlock, SchemaReadBlock };
type SchemaInlineElement = PartialInlineContentElement<
  Schema["inlineContentSchema"],
  Schema["styleSchema"]
>;
type SchemaInlineContent = PartialInlineContent<
  Schema["inlineContentSchema"],
  Schema["styleSchema"]
>;

const PLAYER_ID_SEPARATOR = ",";

function splitPlayerIds(raw: string | undefined): string[] {
  return (raw || "")
    .split(PLAYER_ID_SEPARATOR)
    .map((item) => item.trim())
    .filter(Boolean);
}

/* ------------------------------ wiki → BlockNote ------------------------------ */

function tokenToInlineContent(token: WikiInlineToken): SchemaInlineElement {
  if (token.type === "ref") {
    return {
      type: "wikiRef",
      props: { entryId: token.entryId ?? "", label: token.label ?? "" }
    } as SchemaInlineElement;
  }
  if (token.type === "secret-inline") {
    return {
      type: "wikiSecret",
      props: { playerIds: (token.playerIds ?? []).join(PLAYER_ID_SEPARATOR) },
      content: token.text ?? ""
    } as SchemaInlineElement;
  }
  return {
    type: "text",
    text: token.text ?? "",
    styles: {
      ...(token.bold ? { bold: true } : {}),
      ...(token.strikethrough ? { strike: true } : {}),
      ...(token.color ? { hexTextColor: token.color } : {})
    }
  } as SchemaInlineElement;
}

function tokensToInlineContent(tokens: WikiInlineToken[] | undefined): SchemaInlineContent {
  const elements = (tokens ?? [])
    .filter((token) => Boolean(token && typeof token === "object"))
    .map((token) => tokenToInlineContent(token));
  return elements as SchemaInlineContent;
}

function headingTextToInlineContent(text: string | undefined): SchemaInlineContent {
  const elements: SchemaInlineElement[] = text
    ? [{ type: "text", text, styles: {} } as SchemaInlineElement]
    : [];
  return elements as SchemaInlineContent;
}

export function wikiToBlockNote(blocks: WikiBlock[] | undefined | null): SchemaBlock[] {
  if (!Array.isArray(blocks)) return [];
  const output: SchemaBlock[] = [];
  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;
    switch (block.type) {
      case "heading":
        output.push({
          type: "heading",
          props: { level: 2 },
          content: headingTextToInlineContent(block.text)
        });
        break;
      case "paragraph":
        output.push({ type: "paragraph", content: tokensToInlineContent(block.tokens) });
        break;
      case "quote":
        output.push({ type: "quote", content: tokensToInlineContent(block.tokens) });
        break;
      case "list":
        for (const item of block.items ?? []) {
          output.push({ type: "bulletListItem", content: tokensToInlineContent(item) });
        }
        break;
      case "image":
        output.push({
          type: "image",
          props: { url: block.src ?? "", caption: block.caption ?? "" }
        });
        break;
      case "secret-panel":
        output.push({
          type: "secretPanel",
          props: {
            title: block.title ?? "",
            playerIds: (block.playerIds ?? []).join(PLAYER_ID_SEPARATOR),
            hiddenMode: block.hiddenMode ?? "mask"
          },
          children: wikiToBlockNote(block.blocks ?? [])
        });
        break;
      case "coc-sheet":
        output.push({
          type: "cocSheet",
          props: { cocData: JSON.stringify(block.cocData ?? {}) }
        });
        break;
      default:
        // 未知类型：跳过而不是报错（保存链路不受影响，编辑器不会丢已有内容以外的东西）
        console.warn("[wiki-blocknote-convert] 未知的 wiki 块类型，已跳过：", (block as { type?: string }).type);
        break;
    }
  }
  return output;
}

/* ------------------------------ BlockNote → wiki ------------------------------ */

function inlineContentToTokens(content: unknown): WikiInlineToken[] {
  if (!Array.isArray(content)) return [];
  const tokens: WikiInlineToken[] = [];
  for (const item of content) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (record.type === "text" && typeof record.text === "string") {
      const styles = (record.styles ?? {}) as Record<string, unknown>;
      const token: WikiInlineToken = { type: "text", text: record.text };
      if (styles.bold === true) token.bold = true;
      if (styles.strike === true) token.strikethrough = true;
      if (typeof styles.hexTextColor === "string" && styles.hexTextColor) {
        token.color = styles.hexTextColor;
      }
      tokens.push(token);
      continue;
    }
    if (record.type === "wikiRef") {
      const props = (record.props ?? {}) as Record<string, unknown>;
      const token: WikiInlineToken = { type: "ref" };
      if (props.entryId) token.entryId = String(props.entryId);
      if (props.label) token.label = String(props.label);
      tokens.push(token);
      continue;
    }
    if (record.type === "wikiSecret") {
      const props = (record.props ?? {}) as Record<string, unknown>;
      const token: WikiInlineToken = { type: "secret-inline", text: plainInlineText(record.content) };
      const playerIds = splitPlayerIds(typeof props.playerIds === "string" ? props.playerIds : "");
      if (playerIds.length) token.playerIds = playerIds;
      tokens.push(token);
      continue;
    }
    // 未知行内内容：降级为纯文本占位，避免静默丢失
    tokens.push({ type: "text", text: `[未支持的行内内容: ${String(record.type)}]` });
  }
  return tokens;
}

function plainInlineText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        const record = item as Record<string, unknown>;
        return record && record.type === "text" && typeof record.text === "string" ? record.text : "";
      })
      .join("");
  }
  return "";
}

function blockToWiki(block: unknown, output: WikiBlock[]): void {
  if (!block || typeof block !== "object") return;
  const record = block as Record<string, unknown>;
  const props = (record.props ?? {}) as Record<string, unknown>;
  const children = Array.isArray(record.children) ? record.children : [];

  switch (record.type) {
    case "heading": {
      const blockRecord = block as unknown as Record<string, unknown>;
      const text = plainInlineText(blockRecord.content);
      const wikiBlock: WikiBlock = { type: "heading" };
      if (text) wikiBlock.text = text;
      output.push(wikiBlock);
      break;
    }
    case "paragraph":
    case "quote": {
      const blockRecord = block as unknown as Record<string, unknown>;
      const tokens = inlineContentToTokens(blockRecord.content);
      const wikiBlock: WikiBlock = { type: record.type as WikiBlock["type"] };
      if (tokens.length) wikiBlock.tokens = tokens;
      output.push(wikiBlock);
      break;
    }
    case "bulletListItem":
    case "numberedListItem": {
      // 由调用方合并进 list；单独出现时（理论上不会）也按 list 兜底
      const blockRecord = block as unknown as Record<string, unknown>;
      const tokens = inlineContentToTokens(blockRecord.content);
      const wikiBlock: WikiBlock = { type: "list", items: [tokens] };
      output.push(wikiBlock);
      break;
    }
    case "image": {
      const wikiBlock: WikiBlock = { type: "image" };
      if (props.url) wikiBlock.src = String(props.url);
      if (props.caption) wikiBlock.caption = String(props.caption);
      output.push(wikiBlock);
      break;
    }
    case "secretPanel": {
      const wikiBlock: WikiBlock = { type: "secret-panel" };
      if (props.title) wikiBlock.title = String(props.title);
      const playerIds = splitPlayerIds(typeof props.playerIds === "string" ? props.playerIds : "");
      if (playerIds.length) wikiBlock.playerIds = playerIds;
      wikiBlock.hiddenMode = props.hiddenMode === "collapse" ? "collapse" : "mask";
      wikiBlock.blocks = blockNoteToWiki(children);
      output.push(wikiBlock);
      break;
    }
    case "cocSheet": {
      const wikiBlock: WikiBlock = { type: "coc-sheet" };
      let cocData: CocSheetData | undefined;
      try {
        cocData = JSON.parse(String(props.cocData ?? "{}")) as CocSheetData;
      } catch {
        cocData = undefined;
      }
      if (cocData) wikiBlock.cocData = cocData;
      output.push(wikiBlock);
      break;
    }
    default: {
      // BN 独有块（checkListItem/codeBlock/table/divider/file 等）：降级为段落纯文本，防丢数据
      const blockRecord = block as unknown as Record<string, unknown>;
      if (typeof blockRecord.content === "string" ? blockRecord.content : Array.isArray(blockRecord.content)) {
        const text = plainInlineText(blockRecord.content);
        const tokens: WikiInlineToken[] = text ? [{ type: "text", text }] : [];
        const wikiBlock: WikiBlock = { type: "paragraph" };
        if (tokens.length) wikiBlock.tokens = tokens;
        output.push(wikiBlock);
      }
      break;
    }
  }

  // 非 secretPanel 块的子块：拍平为其后的兄弟块
  if (record.type !== "secretPanel" && children.length) {
    blockNoteToWiki(children).forEach((child) => output.push(child));
  }
}

/**
 * 接受 BlockNote 编辑器产出的 blocks（Block[]，含 id）或手工构造的
 * PartialBlock[]/纯 JSON——内部按 JSON 结构宽松读取。
 */
export function blockNoteToWiki(blocks: unknown[] | undefined | null): WikiBlock[] {
  if (!Array.isArray(blocks)) return [];
  const output: WikiBlock[] = [];
  let pendingList: WikiBlock | null = null;

  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;
    const record = block as Record<string, unknown>;
    if (record.type === "bulletListItem" || record.type === "numberedListItem") {
      const tokens = inlineContentToTokens(record.content);
      if (!pendingList) {
        pendingList = { type: "list", items: [] };
        output.push(pendingList);
      }
      pendingList.items!.push(tokens);
      continue;
    }
    pendingList = null;
    blockToWiki(block, output);
  }
  return output;
}
