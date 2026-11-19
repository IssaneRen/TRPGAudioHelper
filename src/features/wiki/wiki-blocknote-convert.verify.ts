import assert from "node:assert/strict";
import { blockNoteToWiki, wikiToBlockNote } from "./wiki-blocknote-convert";
import type { WikiBlock } from "@/types/wiki";

/**
 * WikiBlock[] ↔ BlockNote blocks 双向转换回归（pnpm test:wiki-convert）。
 * 核心目标：round-trip 无损（存储格式是唯一事实源），以及畸形输入不抛错。
 */

const sample: WikiBlock[] = [
  { type: "heading", text: "第一章 抵达" },
  {
    type: "paragraph",
    tokens: [
      { type: "text", text: "火车在黄昏进站，" },
      { type: "text", text: "雨下得很大", bold: true },
      { type: "text", text: "——这一句有颜色", color: "#8b0000" },
      { type: "text", text: "删除线", strikethrough: true },
      { type: "ref", entryId: "entry.morioka", label: "森冈" },
      { type: "secret-inline", text: "车票藏在怀表里", playerIds: ["pl.cici", "pl.ren"] }
    ]
  },
  {
    type: "list",
    items: [
      [{ type: "text", text: "清点行李" }],
      [{ type: "text", text: "核对车票", bold: true }, { type: "ref", entryId: "entry.ticket" }]
    ]
  },
  { type: "quote", tokens: [{ type: "text", text: "「车站的钟停了。」" }] },
  { type: "image", src: "/content-assets/station.png", caption: "奈面町车站" },
  {
    type: "secret-panel",
    title: "怀表的秘密",
    playerIds: ["pl.cici"],
    hiddenMode: "mask",
    blocks: [
      { type: "paragraph", tokens: [{ type: "text", text: "表盖内侧刻着地址。" }] },
      {
        type: "secret-panel",
        title: "内层秘密",
        playerIds: ["pl.ren"],
        hiddenMode: "collapse",
        blocks: [{ type: "heading", text: "更深的层级" }]
      }
    ]
  },
  {
    type: "coc-sheet",
    cocData: {
      avatar: "/content-assets/coc.png",
      attributes: { str: 50, con: 55, siz: 60, dex: 70, int: 75, pow: 65, app: 45, edu: 80, hp: 11, maxHp: 11, mp: 13, maxMp: 13, san: 60, maxSan: 60, luck: 55, damageBonus: "+1D4" },
      skills: { 侦查: { base: 60, growth: 5 }, 聆听: 45 }
    }
  },
  { type: "paragraph" },
  { type: "list", items: [[], [{ type: "text", text: "空项之后的一项" }]] }
];

// 1) wiki → BlockNote → wiki round-trip 无损
const bn = wikiToBlockNote(sample);
assert.equal(bn.length, 11, "list 展开为 bulletListItem，块数应为 11（1 heading + 1 paragraph + 2 list + 1 quote + 1 image + 1 secretPanel + 1 cocSheet + 1 paragraph + 2 list）");
const roundTripped = blockNoteToWiki(bn);
assert.deepStrictEqual(roundTripped, sample, "round-trip 后应与原始 WikiBlock[] 深度相等");

// 2) secret-panel 映射为自定义块并携带 children
const panel = bn.find((block) => block.type === "secretPanel") as
  | { props: { title: string; playerIds: string; hiddenMode: string }; children?: Array<{ type: string; props: { hiddenMode: string } }> }
  | undefined;
assert.ok(panel, "secret-panel 应映射为 secretPanel 块");
assert.equal(panel.props.title, "怀表的秘密");
assert.equal(panel.props.playerIds, "pl.cici");
assert.equal(panel.props.hiddenMode, "mask");
assert.equal(panel.children?.length, 2, "嵌套块转为 children");
assert.equal(panel.children?.[1]?.type, "secretPanel", "嵌套 secret-panel 递归映射");
assert.equal(panel.children?.[1]?.props.hiddenMode, "collapse");

// 3) 行内映射
const paragraph = bn.find((block) => block.type === "paragraph");
const inline = (paragraph?.content ?? []) as Array<Record<string, unknown>>;
assert.equal(inline.length, 6, "6 个 token");
const styled = inline[1] as { styles: Record<string, unknown> };
assert.equal(styled.styles.bold, true, "bold → bold style");
const colored = inline[2] as { styles: Record<string, unknown> };
assert.equal(colored.styles.hexTextColor, "#8b0000", "color → hexTextColor style");
const refInline = inline[4] as { type: string; props: Record<string, unknown> };
assert.equal(refInline.type, "wikiRef");
assert.equal(refInline.props.entryId, "entry.morioka");
const secretInline = inline[5] as { type: string; content: string; props: Record<string, unknown> };
assert.equal(secretInline.type, "wikiSecret");
assert.equal(secretInline.content, "车票藏在怀表里");
assert.equal(secretInline.props.playerIds, "pl.cici,pl.ren");

// 4) BN 独有块回转降级 + 连续列表项合并
const degraded = blockNoteToWiki([
  { id: "a", type: "checkListItem", props: { checked: true }, content: [{ type: "text", text: "待办", styles: {} }], children: [] },
  { id: "b", type: "bulletListItem", props: {}, content: [{ type: "text", text: "一项", styles: {} }], children: [] },
  { id: "c", type: "bulletListItem", props: {}, content: [{ type: "text", text: "两项", styles: {} }], children: [] },
  { id: "d", type: "divider", props: {}, content: undefined, children: [] },
  { id: "e", type: "paragraph", props: {}, content: [{ type: "text", text: "正文", styles: {} }], children: [
    { id: "e1", type: "paragraph", props: {}, content: [{ type: "text", text: "被嵌套的子块", styles: {} }], children: [] }
  ] }
] as never);
assert.deepStrictEqual(degraded, [
  { type: "paragraph", tokens: [{ type: "text", text: "待办" }] },
  { type: "list", items: [[{ type: "text", text: "一项" }], [{ type: "text", text: "两项" }]] },
  { type: "paragraph", tokens: [{ type: "text", text: "正文" }] },
  { type: "paragraph", tokens: [{ type: "text", text: "被嵌套的子块" }] }
], "checkListItem 降级为段落；连续 bulletListItem 合并为一个 list；divider（无内容）丢弃；子块拍平");

// 5) 空内容块往返规范化
const emptyRoundTrip = blockNoteToWiki(
  wikiToBlockNote([{ type: "paragraph" }, { type: "quote" }, { type: "list", items: [] }])
);
assert.deepStrictEqual(emptyRoundTrip, [{ type: "paragraph" }, { type: "quote" }], "空 paragraph/quote 规范化回原样；空 items 的 list 展开后消失（无内容可保）");

// 6) 畸形输入不抛错
assert.deepStrictEqual(wikiToBlockNote(undefined), []);
assert.deepStrictEqual(wikiToBlockNote(null), []);
assert.deepStrictEqual(wikiToBlockNote([null as never, undefined as never, { type: "mystery" } as never]), [], "null/未知类型跳过");
assert.deepStrictEqual(blockNoteToWiki(undefined), []);
assert.deepStrictEqual(blockNoteToWiki([null as never]), []);
assert.deepStrictEqual(
  blockNoteToWiki([{ id: "x", type: "cocSheet", props: { cocData: "{invalid json" }, children: [] } as never]),
  [{ type: "coc-sheet" }],
  "cocData JSON 损坏时输出空 coc-sheet 块，不抛错"
);
assert.deepStrictEqual(
  blockNoteToWiki([{ id: "y", type: "paragraph", props: {}, content: [{ type: "mysteryInline", some: 1 }], children: [] } as never]),
  [{ type: "paragraph", tokens: [{ type: "text", text: "[未支持的行内内容: mysteryInline]" }] }],
  "未知行内内容降级为占位文本"
);

// 7) coc-sheet 数据往返保真
const sheet = blockNoteToWiki(bn).find((block) => block.type === "coc-sheet");
assert.ok(sheet);
assert.equal(sheet.cocData?.attributes?.str, 50);
assert.equal(sheet.cocData?.skills?.["侦查"] && typeof sheet.cocData.skills["侦查"] === "object" ? (sheet.cocData.skills["侦查"] as { growth: number }).growth : -1, 5);

console.log("wiki blocknote conversion verification passed");
