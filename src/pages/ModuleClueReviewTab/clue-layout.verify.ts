import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildClueReviewLayout,
  getVisibleOutgoingEdges,
  getHighlightState,
  getVisibleClueGraph,
  type ModuleClueReviewData,
} from "./clue-layout";

const fixture: ModuleClueReviewData = {
  module: { id: "naimen-prologue", name: "奈面序章" },
  clues: [
    {
      id: "arrival",
      title: "抵达奈面町",
      summary: "起点",
      detail: "抵达记录",
      tags: ["序章"],
      order: 1,
      reveals: ["letter", "clock"],
    },
    {
      id: "letter",
      title: "密信",
      summary: "中间线索",
      detail: "信件记录",
      tags: ["密信"],
      order: 2,
      reveals: ["clock"],
    },
    {
      id: "clock",
      title: "停摆的站钟",
      summary: "最远线索",
      detail: "站钟记录",
      tags: ["时间"],
      order: 3,
      reveals: [],
    },
    {
      id: "isolated",
      title: "孤立记录",
      summary: "无关系线索",
      detail: "独立记录",
      tags: ["旁支"],
      order: 4,
      reveals: [],
    },
  ],
  edges: [
    { id: "arrival->letter", source: "arrival", target: "letter", reason: "抵达后收到密信" },
    { id: "letter->clock", source: "letter", target: "clock", reason: "密信记录了站钟时间" },
    { id: "arrival->clock", source: "arrival", target: "clock", reason: "抵达现场能直接看到站钟" },
  ],
  tags: ["序章", "密信", "时间", "旁支"],
};

const layout = buildClueReviewLayout(fixture);
assert.deepEqual(
  layout.columns.map((column) => column.clues.map((clue) => clue.id)),
  [["arrival", "isolated"], ["letter"], ["clock"]],
  "线索应按最长推导距离横向分列，同列按 order 排序",
);

const fanOutFixture: ModuleClueReviewData = {
  module: { id: "fanout", name: "连线分散测试" },
  clues: [
    { id: "root", title: "入口", tags: [], order: 1, reveals: ["branch-a", "branch-b"] },
    { id: "branch-a", title: "分支 A", tags: [], order: 2, reveals: ["leaf-1", "leaf-2", "leaf-3", "leaf-4", "leaf-5"] },
    { id: "branch-b", title: "分支 B", tags: [], order: 3, reveals: ["leaf-6", "leaf-7", "leaf-8", "leaf-9", "leaf-10"] },
    ...Array.from({ length: 10 }, (_, index) => ({
      id: `leaf-${index + 1}`,
      title: `第三列 ${index + 1}`,
      tags: [],
      order: 10 + index,
      reveals: [],
    })),
  ],
  edges: [
    { id: "root->branch-a", source: "root", target: "branch-a" },
    { id: "root->branch-b", source: "root", target: "branch-b" },
    ...Array.from({ length: 5 }, (_, index) => ({
      id: `branch-a->leaf-${index + 1}`,
      source: "branch-a",
      target: `leaf-${index + 1}`,
    })),
    ...Array.from({ length: 5 }, (_, index) => ({
      id: `branch-b->leaf-${index + 6}`,
      source: "branch-b",
      target: `leaf-${index + 6}`,
    })),
  ],
  tags: [],
};
const fanOutLayout = buildClueReviewLayout(fanOutFixture);
assert.deepEqual(
  fanOutLayout.columns.map((column) => column.clues.map((clue) => clue.id)),
  [
    ["root"],
    ["branch-a", "branch-b"],
    ["leaf-1", "leaf-2", "leaf-3", "leaf-4", "leaf-5", "leaf-6", "leaf-7", "leaf-8", "leaf-9", "leaf-10"],
  ],
);
assert.equal(fanOutLayout.rowByClueId.get("branch-a"), 0);
assert.equal(fanOutLayout.rowByClueId.get("branch-b"), 5);

const tagHighlight = getHighlightState(fixture, { type: "tag", tag: "序章" });
assert.deepEqual([...tagHighlight.highlightedClueIds].sort(), ["arrival", "clock", "letter"]);
assert.deepEqual([...tagHighlight.highlightedEdgeIds].sort(), [
  "arrival->clock",
  "arrival->letter",
  "letter->clock",
]);

const itemHighlight = getHighlightState(fixture, { type: "clue", clueId: "letter" });
assert.deepEqual([...itemHighlight.highlightedClueIds].sort(), ["clock", "letter"]);
assert.deepEqual([...itemHighlight.highlightedEdgeIds], ["letter->clock"]);

const visible = getVisibleClueGraph(fixture, new Set(["arrival", "clock"]));
assert.deepEqual(visible.clues.map((clue) => clue.id), ["arrival", "clock"]);
assert.deepEqual(visible.edges, [
  { id: "arrival->clock", source: "arrival", target: "clock", reason: "抵达现场能直接看到站钟" },
]);
assert.deepEqual(visible.tags, ["序章", "时间"]);

const visibleOutgoing = getVisibleOutgoingEdges(fixture, "arrival");
assert.deepEqual(
  visibleOutgoing.map((edge) => ({
    source: edge.source,
    target: edge.target,
    targetTitle: edge.targetClue.title,
    reason: edge.reason,
  })),
  [
    { source: "arrival", target: "letter", targetTitle: "密信", reason: "抵达后收到密信" },
    { source: "arrival", target: "clock", targetTitle: "停摆的站钟", reason: "抵达现场能直接看到站钟" },
  ],
  "详情页需要展示当前可见后续线索和推导原因",
);

const naimenModule = JSON.parse(
  readFileSync("trpg-ai-gateway/data/module-clues/naimen-prologue/clues.json", "utf-8"),
) as { moduleId: string; moduleName: string; clues: ModuleClueReviewData["clues"] };
const naimenClueIds = new Set(naimenModule.clues.map((clue) => clue.id));
assert.equal(naimenModule.moduleId, "naimen-prologue");
assert.equal(naimenModule.clues.filter((clue) => clue.isInitial).length, 1);
assert.ok(naimenClueIds.has("larkin-recruitment"), "奈面序章应以拉金招募作为入口线索");
assert.ok(!naimenClueIds.has("station-clock"), "奈面序章不应保留车站占位线索");
assert.ok(naimenModule.clues.length >= 12 && naimenModule.clues.length <= 18, "奈面序章线索应压缩为 12-18 个复合节点");
for (const expectedClueId of [
  "lima-suspicion",
  "elias-warning",
  "museum-seal-evidence",
  "mendoza-kharisiri",
  "puno-naira-lead",
  "highland-ruins",
  "seal-choice",
]) {
  assert.ok(naimenClueIds.has(expectedClueId), `奈面序章缺少复合线索 ${expectedClueId}`);
}
for (const clue of naimenModule.clues) {
  assert.ok(!clue.title.includes("奈亚拉托提普碎片"), "PL 复盘标题不应过早剧透拉金体内真相");
  for (const targetId of clue.reveals) {
    assert.ok(naimenClueIds.has(targetId), `${clue.id} reveals missing clue ${targetId}`);
    assert.ok(
      clue.revealReasons?.[targetId],
      `${clue.id} -> ${targetId} should record a reveal reason`,
    );
  }
}
const naimenDepthLayout = buildClueReviewLayout({
  module: { id: naimenModule.moduleId, name: naimenModule.moduleName },
  clues: naimenModule.clues,
  edges: naimenModule.clues.flatMap((clue) =>
    clue.reveals.map((targetId) => ({
      id: `${clue.id}->${targetId}`,
      source: clue.id,
      target: targetId,
      reason: clue.revealReasons?.[targetId],
    })),
  ),
  tags: [],
});
assert.ok(
  Math.max(...naimenDepthLayout.columns.map((column) => column.index)) <= 4,
  "奈面序章主图应控制在入口、利马、证据、遗迹、后续伏笔五列以内",
);

const moduleClueReviewSource = readFileSync("src/pages/ModuleClueReviewTab/index.tsx", "utf-8");
const selectClueBody = moduleClueReviewSource.match(/const selectClue = \(clue: ModuleClueReviewClue\) => \{[\s\S]*?\n  \};/)?.[0] ?? "";
assert.ok(!selectClueBody.includes("setSelection"), "点击线索卡片只应打开详情，不应直接切换高亮");
assert.ok(moduleClueReviewSource.includes("onHighlightClue"), "详情弹窗需要提供显式高亮切换动作");
assert.ok(
  moduleClueReviewSource.includes('{clueHighlighted ? "高亮后续线索" : "取消高亮"}'),
  "详情弹窗高亮按钮文案应匹配当前高亮状态",
);
assert.ok(moduleClueReviewSource.includes("推导出后续线索"), "详情弹窗需要展示后续线索推导信息");
assert.ok(!moduleClueReviewSource.includes("text-foreground/70"), "未命中线索不应通过文字透明度变灰");
assert.ok(!moduleClueReviewSource.includes("bg-card/65"), "未命中线索不应通过卡片背景透明度变灰");
assert.ok(!moduleClueReviewSource.includes("strokeOpacity={hasSelection"), "选中态不应让非活跃连线整体变暗");

console.log("module clue layout verification passed");
